import { NextResponse } from "next/server";

// Environment-based configuration
const ENVIRONMENT = process.env.NODE_ENV || "development";
const IS_PRODUCTION = ENVIRONMENT === "production";
const TESTING = !IS_PRODUCTION; // Testing mode in development

const DODO_API_URL = TESTING 
  ? "https://test.dodopayments.com" 
  : "https://live.dodopayments.com";

const PRODUCT_ID = process.env.DODO_PRODUCT_ID || "pdt_0NVKFpzt1jbHkCXW0gbfK";

// Get webhook URL based on environment and request
const getWebhookUrl = (req: Request) => {
  const requestUrl = new URL(req.url)
  const origin = req.headers.get('origin') || requestUrl.origin
  
  if (IS_PRODUCTION) {
    // In production, use the current domain
    return `${origin}/webhooks/dodo`
  } else {
    // In development, use environment variable or ngrok
    return process.env.DODO_WEBHOOK_URL || `${origin}/webhooks/dodo`
  }
};

export async function POST(req: Request) {
  try {
    const { user } = await req.json();

    const requestUrl = new URL(req.url)
    const origin = req.headers.get('origin') || requestUrl.origin

    if (!user || !user.userId) {
      return NextResponse.json({ error: "User data is required" }, { status: 400 });
    }

    const toStringOrEmpty = (value: unknown) =>
      typeof value === "string" ? value : "";

    const fullNameParts = toStringOrEmpty(user.fullName)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const derivedFirstName = fullNameParts[0] || "";
    const derivedLastName = fullNameParts.slice(1).join(" ") || "";

    const safeFirstName = toStringOrEmpty(user.firstName) || derivedFirstName;
    const safeLastName = toStringOrEmpty(user.lastName) || derivedLastName;
    const safeFullName =
      toStringOrEmpty(user.fullName) ||
      [safeFirstName, safeLastName].filter(Boolean).join(" ").trim() ||
      "Customer";
    const safeEmail = toStringOrEmpty(user.email);
    const safeUserId = String(user.userId);

    // Check if DodoPayments API key is configured
    if (!process.env.DODO_API_KEY || process.env.DODO_API_KEY === "sk_test_xxxxxxxxx") {
      // For testing without real API key, redirect to success page directly
      // This simulates a successful payment flow
      return NextResponse.json({
        checkout_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?test=true&userId=${user.userId}`
      });
    }

    console.log("Making DodoPayments API call with:", {
      environment: TESTING ? "TEST" : "PRODUCTION",
      url: `${DODO_API_URL}/checkouts`,
      apiKey: process.env.DODO_API_KEY?.substring(0, 10) + "...",
      productId: PRODUCT_ID,
      webhookUrl: getWebhookUrl(req),
      user: {
        userId: safeUserId,
        email: safeEmail,
        fullName: safeFullName,
      }
    });

    const res = await fetch(`${DODO_API_URL}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DODO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "payment",
        product_cart: [
          {
            product_id: PRODUCT_ID,
            quantity: 1,
          },
        ],
        
        // Add customer data to pre-fill checkout
        customer: {
          email: safeEmail,
          name: safeFullName,
        },

    
        
        // 🛠 No phone number field
        feature_flags: {
          allow_phone_number_collection: false
        },

        // 🛠 Optional: minimal address mode
        minimal_address: true,

        client_reference_id: user.userId,
        metadata: {
          userId: safeUserId,
          email: safeEmail,
          firstName: safeFirstName,
          lastName: safeLastName,
          fullName: safeFullName,
          plan: "1year",
        },
        
        return_url: `${origin}/processing`,
        cancel_url: `${origin}/cancel`,
      }),
    });

    console.log("DodoPayments API response status:", res.status);

    if (!res.ok) {
      const error = await res.text();
      console.error("DodoPayments API Error:", error);
      return NextResponse.json({ 
        error: "Payment service error. Please try again later." 
      }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      checkout_url: data.checkout_url || data.url,
    });
  } catch (error) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
