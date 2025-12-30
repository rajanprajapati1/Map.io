import "./globals.css";

export const metadata = {
  title: "Map.io - AI-Powered Place Discovery",
  description: "Find the best cafes, restaurants, hotels, and attractions near you with our AI-powered place discovery platform. Search and explore locations worldwide.",
  keywords: ["map", "places", "cafes", "restaurants", "AI assistant", "location search", "travel"],
  authors: [{ name: "Map.io Team" }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
