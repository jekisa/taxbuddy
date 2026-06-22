export const metadata = {
  title: "TaxBuddy - SaaS Otomasi Coretax",
  description: "SaaS untuk mengubah data Excel pajak menjadi XLSX dan XML Coretax.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/css/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
