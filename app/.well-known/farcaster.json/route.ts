import { NextResponse } from "next/server";
// import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    "accountAssociation": {
      "header": "eyJmaWQiOjU3Nzc4MywidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDk2ODg4QjExZTEwOTdEMTdiQzk2MDRCYTdiODQ5Nzc5NDYxYUNCMDIifQ",
      "payload": "eyJkb21haW4iOiJ3ZWIzLW1hcmtldHBsYWNlLmNvbSJ9",
      "signature": "MHg4NjdmYjU3ZDhmZDdhN2MyNjY4Yzk0OWZmNDhmOGI1MmQxZjAzM2FhODQwMGVkMDZkOTUzMjY2ODA4ZjUyY2ZiNjVmOTUwYWRjOGNmOTRkODQzNjM3Yzg1NzZlYmE1NTIwNTVmNGNmZjhjM2RmZDI4MjBlNzdjNjg1MmZlYmRiODFi"
    },
    "frame": {
      "version": "1",
      "name": "Example Frame",
      "iconUrl": "https://web3-marketplace.com/icon.png",
      "homeUrl": "https://web3-marketplace.com",
      "imageUrl": "https://web3-marketplace.com/image.png",
      "buttonTitle": "Check this out",
      "splashImageUrl": "https://web3-marketplace.com/splash.png",
      "splashBackgroundColor": "#eeccff",
      "webhookUrl": "https://web3-marketplace.com/api/webhook"
    }
  };

  return NextResponse.json(farcasterConfig);
}
