const features = [
  ["01", "Excel Mapping Otomatis", "Simpan template mapping kolom untuk format Excel yang sering dipakai, lalu proses file berikutnya lebih cepat."],
  ["02", "Export XML Coretax", "Generate XML Coretax untuk Pajak Keluaran, Doc Lain Masukan, dan SPT Dokumen Lain dari satu workspace."],
  ["03", "Database Lawan Transaksi", "Kelola penjual, pembeli, pemasok, NPWP, alamat, diskon, dan default transaksi agar data konsisten."],
  ["04", "Validasi Sebelum Export", "Peringatan tanggal, data wajib, duplikat, dan field kosong membantu mengurangi revisi file."],
  ["05", "Dashboard Riwayat", "Lacak faktur yang sudah di-export ke XML sehingga tim punya jejak kerja yang jelas."],
  ["06", "Responsive Workspace", "UI modern dengan tabel TanStack, search, sorting, dan pagination untuk data besar."],
];

const plans = [
  ["Trial", "Gratis", "Untuk mencoba workflow TaxBuddy sebelum memilih package berbayar.", ["Maksimal 10 invoice", "Upload & mapping Excel", "Preview tabel data", "Upgrade saat butuh proses lebih banyak"], "Mulai Trial", "trial", "/app"],
  ["Starter", "Rp299k", "Untuk konsultan atau bisnis kecil yang mulai merapikan proses Coretax.", ["1 workspace", "500 baris proses per bulan", "Template mapping dasar", "Export XLSX & XML"], "Coba Starter", "", "/auth?plan=starter"],
  ["Professional", "Rp799k", "Untuk tim pajak yang rutin mengolah banyak file dan butuh database transaksi.", ["5 user seat", "10.000 baris proses per bulan", "Database penjual, pembeli, pemasok", "Dashboard riwayat export", "Priority support"], "Mulai Professional", "featured", "/auth?plan=professional"],
  ["Enterprise", "Custom", "Untuk perusahaan dengan kebutuhan volume tinggi, audit trail, dan deployment khusus.", ["Unlimited workspace", "Custom approval flow", "Dedicated onboarding", "SLA & support prioritas"], "Hubungi Sales", "", "/auth?plan=enterprise"],
];

const workflow = [
  ["upload", "Upload Excel", "Ambil file transaksi dari sistem penjualan atau pembelian."],
  ["template", "Apply Template", "Gunakan mapping tersimpan untuk menekan pekerjaan manual."],
  ["review", "Review Data", "Cek tabel, warning, database pembeli/pemasok, dan detail transaksi."],
  ["export", "Export Coretax", "Unduh XLSX atau XML yang siap dipakai untuk pelaporan."],
];

function WorkflowIcon({ name }) {
  const paths = {
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8 12 3 7 8" />
        <path d="M12 3v12" />
      </>
    ),
    template: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    review: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="m8.5 11 1.8 1.8 3.8-4.1" />
      </>
    ),
    export: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3 3 3-3" />
      </>
    ),
  };
  return (
    <svg className="workflow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/">
          <img src="/static/img/logo.svg" alt="TaxBuddy" />
          <span>TaxBuddy</span>
        </a>
        <nav>
          <a href="#features">Fitur</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="landing-nav-cta" href="/app">Open App</a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-kicker">Coretax-ready tax automation</p>
          <h1>TaxBuddy</h1>
          <p className="landing-lead">SaaS untuk mengubah data Excel pajak menjadi file XLSX dan XML Coretax yang rapi, tervalidasi, dan siap di-export.</p>
          <div className="landing-actions">
            <a className="landing-btn primary" href="/app">Mulai Sekarang</a>
            <a className="landing-btn secondary" href="#pricing">Lihat Paket</a>
          </div>
          <div className="social-proof" aria-label="Social proof TaxBuddy">
            <p>Dipercaya untuk workflow pajak modern</p>
            <div className="proof-grid">
              <div><strong>10k+</strong><span>baris transaksi siap diproses</span></div>
              <div><strong>3</strong><span>format export pajak utama</span></div>
              <div><strong>99%</strong><span>lebih sedikit mapping manual berulang</span></div>
            </div>
            <div className="proof-logos">
              <span>Konsultan Pajak</span>
              <span>Retail</span>
              <span>Marketplace Seller</span>
              <span>Finance Team</span>
            </div>
          </div>
        </div>
        <div className="product-preview" aria-label="Preview aplikasi TaxBuddy">
          <div className="preview-top">
            <span /><span /><span />
            <strong>TaxBuddy Workspace</strong>
          </div>
          <div className="preview-body">
            <aside>
              <b>Dashboard</b>
              <b>Pajak Keluaran</b>
              <b>Doc Lain</b>
              <b>Database</b>
            </aside>
            <section>
              <div className="preview-stats">
                <div><strong>1,284</strong><small>Total Baris</small></div>
                <div><strong>312</strong><small>Faktur Unik</small></div>
                <div><strong>0</strong><small>Blocking Error</small></div>
              </div>
              <div className="preview-table">
                <div><span>No Faktur</span><span>Pembeli</span><span>Status</span></div>
                <div><span>010.007</span><span>PT Nusantara</span><em>Ready</em></div>
                <div><span>010.008</span><span>CV Sentosa</span><em>Mapped</em></div>
                <div><span>010.009</span><span>PT Maju</span><em>Export</em></div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="problem-section">
        <div className="section-heading">
          <p>Problem</p>
          <h2>Proses Coretax sering macet bukan karena pajaknya, tapi karena datanya belum siap.</h2>
        </div>
        <div className="problem-grid">
          <article>
            <span>01</span>
            <h3>Format Excel Berubah-ubah</h3>
            <p>Setiap marketplace, cabang, atau sistem internal bisa punya nama kolom dan urutan data yang berbeda.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Mapping Manual Berulang</h3>
            <p>Tim pajak sering mengulang pekerjaan yang sama untuk menentukan pembeli, pemasok, tanggal, dan detail faktur.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Validasi Terlambat</h3>
            <p>Error NPWP, tanggal, data kosong, atau duplikat baru ketahuan saat file sudah akan di-upload atau dilaporkan.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Riwayat Export Tidak Jelas</h3>
            <p>Tanpa dashboard, sulit melacak faktur mana yang sudah diproses dan mana yang masih perlu diperbaiki.</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="section-heading">
          <p>Fitur utama</p>
          <h2>Dibuat untuk workflow pajak yang berulang, detail, dan sensitif format.</h2>
        </div>
        <div className="feature-grid">
          {features.map(([no, title, body]) => (
            <article key={title}>
              <span>{no}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-band">
        <div>
          <p>Workflow</p>
          <h2>Upload, mapping, validasi, export.</h2>
        </div>
        <ol>
          {workflow.map(([iconName, title, body]) => (
            <li key={title}>
              <div className="workflow-icon-wrap"><WorkflowIcon name={iconName} /></div>
              <b>{title}</b>
              <span>{body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" id="pricing">
        <div className="section-heading">
          <p>Pricing package</p>
          <h2>Pilih paket sesuai ukuran tim dan volume pekerjaan pajak.</h2>
        </div>
        <div className="pricing-grid">
          {plans.map(([name, price, desc, items, cta, modifier, href]) => (
            <article className={`price-card ${modifier}`} key={name}>
              {modifier === "featured" ? <div className="badge">Most popular</div> : null}
              <h3>{name}</h3>
              <p className="price">{price}{price.startsWith("Rp") ? <span>/bulan</span> : null}</p>
              <p>{desc}</p>
              <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
              <a href={href}>{cta}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-heading">
          <p>FAQ</p>
          <h2>Pertanyaan singkat sebelum mulai.</h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>Apakah TaxBuddy menggantikan Coretax?</summary>
            <p>Tidak. TaxBuddy membantu menyiapkan data dan file export agar lebih siap digunakan di Coretax.</p>
          </details>
          <details>
            <summary>Apakah bisa dipakai untuk banyak format Excel?</summary>
            <p>Bisa. Template mapping membantu menyimpan format kolom yang berbeda untuk dipakai ulang.</p>
          </details>
          <details>
            <summary>Apakah data tersimpan?</summary>
            <p>Aplikasi ini punya database lokal untuk template, pembeli, penjual, pemasok, dan riwayat export.</p>
          </details>
        </div>
      </section>

      <footer className="landing-footer">
        <span>TaxBuddy</span>
        <a href="/app">Open App</a>
      </footer>
    </main>
  );
}
