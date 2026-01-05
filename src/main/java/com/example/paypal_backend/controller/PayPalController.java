package com.example.paypal_backend.controller;

import com.example.paypal_backend.service.PayPalService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/paypal")
@CrossOrigin(origins = "*")
public class PayPalController {

    private final PayPalService payPalService;

    public PayPalController(PayPalService payPalService) {
        this.payPalService = payPalService;
    }

    @PostMapping("/create")
    public Map<String, Object> createOrder(@RequestParam double amount) {
        return payPalService.createOrder(amount);
    }
}
