const features = [
  ["mapping", "Excel Mapping Otomatis", "Simpan template mapping kolom untuk berbagai format Excel dan proses file berikutnya lebih cepat."],
  ["export", "Export XML Coretax", "Generate XLSX dan XML Coretax untuk Pajak Keluaran, Doc Lain Masukan, dan SPT Dokumen Lain."],
  ["database", "Database Lawan Transaksi", "Kelola penjual, pembeli, pemasok, NPWP, alamat, dan default transaksi agar data konsisten."],
  ["validation", "Validasi Sebelum Export", "Temukan tanggal tidak valid, data kosong, duplikat, dan blocker sebelum file dipakai untuk pelaporan."],
  ["dashboard", "Dashboard Riwayat", "Pantau faktur yang sudah di-export, paket langganan, invoice bulan ini, dan status akses workspace."],
  ["subscription", "Subscription & Trial", "Trial 10 invoice, paket berbayar, pembayaran Midtrans, dan penguncian otomatis saat masa aktif habis."],
  ["table", "Tabel Data Modern", "Search, sorting, pagination, dan tampilan responsif dengan TanStack untuk data transaksi besar."],
  ["workflow", "Workflow Multi Dokumen", "Kelola Pajak Keluaran, Doc Lain Masukan, dan SPT Dokumen Lain dalam satu aplikasi SaaS."],
];

const plans = [
  ["Starter", "Rp299k", "/bulan", "", ["1 workspace aktif", "500 baris proses per bulan", "Template mapping dasar", "Export XLSX & XML", "Trial 10 invoice sebelum upgrade"], "Get started", "", "/auth?plan=starter"],
  ["Professional", "Rp799k", "/bulan", "10% OFF", ["5 user seat", "10.000 baris proses per bulan", "Database penjual, pembeli, pemasok", "Dashboard riwayat export", "Priority support"], "Get started", "featured", "/auth?plan=professional"],
  ["Enterprise", "Custom", "", "", ["Unlimited workspace", "Custom approval flow", "Dedicated onboarding", "SLA & support prioritas", "Integrasi dan deployment khusus"], "Get started", "", "/auth?plan=enterprise"],
];

const workflow = [
  ["upload", "Upload Excel", "Ambil file transaksi dari sistem penjualan atau pembelian."],
  ["template", "Apply Template", "Gunakan mapping tersimpan untuk menekan pekerjaan manual."],
  ["review", "Review Data", "Cek tabel, warning, database pembeli/pemasok, dan detail transaksi."],
  ["export", "Export Coretax", "Unduh XLSX atau XML yang siap dipakai untuk pelaporan."],
];

const testimonials = [
  ["TaxBuddy memangkas pekerjaan mapping bulanan kami. Tim bisa fokus review data, bukan merapikan kolom Excel terus-menerus.", "Rina P.", "Tax Manager, Retail Group"],
  ["Validasi sebelum export membantu kami menemukan data kosong lebih awal. Proses Coretax jadi jauh lebih tenang.", "Adit S.", "Konsultan Pajak"],
  ["Dashboard riwayat export membuat tracking faktur lebih jelas untuk tim finance dan owner.", "Melati K.", "Finance Lead, Marketplace Seller"],
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

function FeatureIcon({ name }) {
  const paths = {
    mapping: <><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /><path d="M8 5v14" /><path d="M16 5v14" /></>,
    export: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
    validation: <><path d="M20 6 9 17l-5-5" /><path d="M4 4h16v16H4z" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="8" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="15" width="7" height="6" rx="1" /></>,
    subscription: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8" /><path d="M8 12h5" /><path d="m9 17 2 2 4-5" /></>,
    table: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /><path d="M8 6v12" /><path d="M14 6v12" /></>,
    workflow: <><path d="M6 7a3 3 0 1 0 0 .1" /><path d="M18 7a3 3 0 1 0 0 .1" /><path d="M6 17a3 3 0 1 0 0 .1" /><path d="M18 17a3 3 0 1 0 0 .1" /><path d="M9 7h6" /><path d="M9 17h6" /></>,
  };
  return (
    <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
        <a className="landing-nav-cta" href="/app">Mulai Gratis sekarang!</a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-kicker">Enterprise tax operations platform</p>
          <h1>TaxBuddy</h1>
          <p className="landing-lead">Platform SaaS untuk tim pajak modern yang butuh kontrol, validasi, audit trail, dan export Coretax dari workflow Excel yang kompleks.</p>
          <div className="enterprise-proof-row">
            <span>Secure workflow</span>
            <span>Audit-ready export</span>
            <span>Multi-format Coretax</span>
          </div>
          <div className="landing-actions">
            <a className="landing-btn primary" href="/app">Mulai Gratis sekarang!</a>
            <a className="landing-btn secondary" href="#demo">Lihat Demo sekarang!</a>
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
        <div className="problem-luxe-panel">
          <div className="problem-luxe-heading">
            <span>Your Problems</span>
            <h2>Is Your Team Stuck Doing Manual Tax Work?</h2>
          </div>
          <div className="problem-luxe-grid">
            <article>
              <div className="problem-object maze" aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              <h3>Hard to Find Data</h3>
              <p>Invoice, NPWP, buyer data, and mapping references are spread across messy Excel files and old notes.</p>
            </article>
            <article>
              <div className="problem-object orbit" aria-hidden="true">
                <i /><i /><i />
              </div>
              <h3>Too Many Mistakes</h3>
              <p>Manual entry and repeated mapping create errors in dates, tax numbers, duplicate invoices, and export fields.</p>
            </article>
            <article>
              <div className="problem-object vault" aria-hidden="true">
                <i /><i />
              </div>
              <h3>Subscription Gaps</h3>
              <p>Without clear access control, expired packages and trial limits can interrupt tax work at the worst time.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="feature-showcase">
          <div className="feature-heading">
            <span className="feature-badge">&loz; Our Features</span>
            <h2>Built for the Love of Clean Tax Data</h2>
            <p>Streamline recurring Coretax work with mapping templates, validation tools, subscription access, and export-ready document workflows.</p>
          </div>
          <div className="feature-grid">
            {features.map(([iconName, title, body]) => (
              <article key={title}>
                <span className={`feature-icon-wrap ${iconName}`}>
                  <FeatureIcon name={iconName} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <p className="feature-note">TaxBuddy membantu tim pajak menyiapkan data Coretax lebih cepat, rapi, dan mudah diaudit.</p>
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

      <section className="demo-section" id="demo">
        <div className="demo-showcase">
          <div className="demo-showcase-head">
            <div>
              <h2>What Tax Automation Looks Like</h2>
              <div className="demo-rating">
                <span>4.9/5</span>
                <b>★</b>
                <strong>TaxBuddy</strong>
                <small>Based on 3,987 processed invoices</small>
              </div>
            </div>
            <div className="demo-copy">
              <p>Get an inside look at how teams upload Excel, apply mapping templates, validate invoice data, and export Coretax-ready files consistently.</p>
              <div className="demo-actions">
                <a className="demo-btn primary" href="/app">Mulai Gratis</a>
                <a className="demo-btn secondary" href="#pricing">Pricing Plans →</a>
              </div>
            </div>
          </div>
          <a className="demo-video-frame" href="/app" aria-label="Lihat demo TaxBuddy">
            <img src="/static/img/demo-video-thumb.png" alt="Demo TaxBuddy automation workspace" />
            <span className="demo-play">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="m8 5 11 7-11 7z" />
              </svg>
            </span>
          </a>
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="pricing-heading">
          <h2>Our pricing plans</h2>
          <p>Pilih paket yang paling pas untuk volume invoice, workflow Coretax, dan kebutuhan tim pajak Anda.</p>
          <a href="/app">Mulai trial gratis untuk 10 invoice</a>
        </div>
        <div className="pricing-grid">
          {plans.map(([name, price, period, discount, items, cta, modifier, href]) => (
            <article className={`price-card ${modifier}`} key={name}>
              {modifier === "featured" ? <div className="badge">Popular Plan</div> : null}
              <h3>{name} plan {discount ? <span>{discount}</span> : null}</h3>
              <p className="price">{price}{period ? <span>{period}</span> : null}</p>
              <a className="pricing-cta" href={href}>{cta}</a>
              <b className="pricing-benefits">Benefits</b>
              <ul>{items.map((item) => <li key={item}><span aria-hidden="true">&check;</span>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="testimonial-section" id="testimonials">
        <div className="testimonial-heading">
          <p>Testimonials</p>
          <h2>What Our Client Say!</h2>
        </div>
        <div className="testimonial-carousel">
          <button className="testimonial-arrow" aria-label="Testimoni sebelumnya">&lsaquo;</button>
          <div className="testimonial-track">
            {testimonials.map(([quote, name, role], index) => (
              <article className={`testimonial-card ${index === 1 ? "active" : ""}`} key={name}>
                <span className="quote-mark">&ldquo;</span>
                <p>{quote}</p>
                <div className="testimonial-person">
                  <div className="testimonial-avatar" aria-hidden="true">{name.charAt(0)}</div>
                  <div>
                    <b>{name}</b>
                    <span>{role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <button className="testimonial-arrow" aria-label="Testimoni berikutnya">&rsaquo;</button>
        </div>
        <div className="testimonial-dots" aria-hidden="true">
          {testimonials.map(([, name], index) => (
            <span className={index === 1 ? "active" : ""} key={name} />
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-shell">
          <aside className="faq-aside">
            <p className="faq-kicker"><span /> FAQs</p>
            <h2>Frequently Asked Questions</h2>
            <div className="faq-call-card">
              <div className="faq-call-avatar">T</div>
              <h3>Book a 15 min call</h3>
              <p>Jika masih ada pertanyaan sebelum berlangganan, jadwalkan demo singkat dengan tim TaxBuddy.</p>
              <a href="#demo">Lihat Demo sekarang!</a>
            </div>
          </aside>
          <div className="faq-list">
            <details open>
              <summary>Apakah TaxBuddy menggantikan Coretax?</summary>
              <p>Tidak. TaxBuddy membantu menyiapkan data, validasi, dan file export agar lebih siap digunakan di Coretax.</p>
            </details>
            <details>
              <summary>Apakah bisa dipakai untuk banyak format Excel?</summary>
              <p>Bisa. Template mapping membantu menyimpan format kolom yang berbeda untuk dipakai ulang oleh tim.</p>
            </details>
            <details>
              <summary>Bagaimana cara kerja paket trial?</summary>
              <p>Trial dapat memproses hingga 10 invoice. Setelah itu user akan diarahkan untuk memilih paket berbayar.</p>
            </details>
            <details>
              <summary>Apakah pembayaran otomatis aktif setelah Midtrans berhasil?</summary>
              <p>Ya. Setelah Midtrans mengirim status sukses, subscription akan aktif dan masa berlangganan tersimpan di MongoDB.</p>
            </details>
            <details>
              <summary>Apa yang terjadi jika masa berlangganan habis?</summary>
              <p>Menu aplikasi akan terkunci sampai user memperpanjang paket langganan.</p>
            </details>
            <details>
              <summary>Apakah data tersimpan?</summary>
              <p>Aplikasi menyimpan akun, subscription, template, database lawan transaksi, dan riwayat export sesuai konfigurasi aplikasi.</p>
            </details>
          </div>
        </div>
      </section>

    </main>
  );
}
