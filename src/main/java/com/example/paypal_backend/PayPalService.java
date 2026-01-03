package com.example.paypalbackend;

import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import com.paypal.base.rest.OAuthTokenCredential;
import com.paypal.base.rest.PayPalRESTException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PayPalService {
    
    private APIContext apiContext;
    
    public PayPalService(
            @Value("${paypal.client.id}") String clientId,
            @Value("${paypal.client.secret}") String clientSecret,
            @Value("${paypal.mode}") String mode) {
        
        Map<String, String> config = new HashMap<>();
        config.put("mode", mode);
        
        try {
            OAuthTokenCredential tokenCredential = new OAuthTokenCredential(clientId, clientSecret, config);
            String accessToken = tokenCredential.getAccessToken();
            this.apiContext = new APIContext(accessToken);
            this.apiContext.setConfigurationMap(config);
        } catch (PayPalRESTException e) {
            throw new RuntimeException("Failed to initialize PayPal", e);
        }
    }
    
    public Payment createPayment(Double total, String currency, String description) 
            throws PayPalRESTException {
        
        Amount amount = new Amount();
        amount.setCurrency(currency);
        amount.setTotal(String.format("%.2f", total));
        
        Transaction transaction = new Transaction();
        transaction.setDescription(description);
        transaction.setAmount(amount);
        
        List<Transaction> transactions = new ArrayList<>();
        transactions.add(transaction);
        
        Payer payer = new Payer();
        payer.setPaymentMethod("paypal");
        
        Payment payment = new Payment();
        payment.setIntent("sale");
        payment.setPayer(payer);
        payment.setTransactions(transactions);
        
        RedirectUrls redirectUrls = new RedirectUrls();
        redirectUrls.setCancelUrl("https://paypal-backend.onrender.com/api/payments/cancel");
        redirectUrls.setReturnUrl("https://paypal-backend.onrender.com/api/payments/success");
        payment.setRedirectUrls(redirectUrls);
        
        return payment.create(apiContext);
    }
    
    public Payment executePayment(String paymentId, String payerId) 
            throws PayPalRESTException {
        
        Payment payment = new Payment();
        payment.setId(paymentId);
        
        PaymentExecution paymentExecute = new PaymentExecution();
        paymentExecute.setPayerId(payerId);
        
        return payment.execute(apiContext, paymentExecute);
    }
}