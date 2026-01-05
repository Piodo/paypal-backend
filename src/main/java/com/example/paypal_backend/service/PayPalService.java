package com.example.paypal_backend.service;

import com.example.paypal_backend.config.PayPalConfig;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PayPalService {

    private final PayPalConfig config;
    private final RestTemplate restTemplate;

    private static final String PAYPAL_API_BASE = "https://api-m.paypal.com"; // LIVE

    public PayPalService(PayPalConfig config, RestTemplate restTemplate) {
        this.config = config;
        this.restTemplate = restTemplate;
    }

    // STEP 1: Get access token
    private String getAccessToken() {
        String url = PAYPAL_API_BASE + "/v1/oauth2/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(config.getClientId(), config.getClientSecret());
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<String> entity =
                new HttpEntity<>("grant_type=client_credentials", headers);

        ResponseEntity<Map> response =
                restTemplate.postForEntity(url, entity, Map.class);

        return response.getBody().get("access_token").toString();
    }

    // STEP 2: Create order
    public Map<String, Object> createOrder(double amount) {
        String token = getAccessToken();

        String url = PAYPAL_API_BASE + "/v2/checkout/orders";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> order = new HashMap<>();
        order.put("intent", "CAPTURE");

        Map<String, Object> amountMap = new HashMap<>();
        amountMap.put("currency_code", "PHP");
        amountMap.put("value", String.format("%.2f", amount));

        Map<String, Object> purchaseUnit = new HashMap<>();
        purchaseUnit.put("amount", amountMap);

        order.put("purchase_units", List.of(purchaseUnit));

        HttpEntity<Map<String, Object>> entity =
                new HttpEntity<>(order, headers);

        ResponseEntity<Map> response =
                restTemplate.postForEntity(url, entity, Map.class);

        return response.getBody();
    }
}
