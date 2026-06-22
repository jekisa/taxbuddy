export const metadata = {
  title: "TaxBuddy - SaaS Otomasi Coretax",
  description: "SaaS untuk mengubah data Excel pajak menjadi XLSX dan XML Coretax.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="stylesheet" href="/static/css/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
