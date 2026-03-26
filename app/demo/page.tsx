export default function DemoPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .demo-root {
          font-family: 'Inter', sans-serif;
          background: #f9f9f9;
          color: #1a1c1c;
        }
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .editorial-shadow {
          box-shadow: 0px 20px 40px rgba(26, 28, 28, 0.06);
        }
        /* Nav */
        .demo-nav {
          position: fixed; top: 0; width: 100%; z-index: 50;
          background: rgba(255,255,255,0.80);
          backdrop-filter: blur(12px);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .demo-nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem; max-width: 80rem; margin: 0 auto;
        }
        .demo-logo { font-size: 1.5rem; font-weight: 900; color: #af101a; letter-spacing: -0.05em; }
        .demo-nav-links { display: flex; align-items: center; gap: 2rem; font-size: 0.875rem; font-weight: 500; }
        .demo-nav-links a { text-decoration: none; color: #334155; transition: color 0.2s; }
        .demo-nav-links a:hover { color: #af101a; }
        .demo-nav-links a.active { color: #af101a; border-bottom: 2px solid #af101a; padding-bottom: 4px; }
        .demo-nav-actions { display: flex; align-items: center; gap: 1.5rem; }
        .demo-nav-icons { display: flex; gap: 0.75rem; color: #475569; }
        .demo-nav-icons span { cursor: pointer; transition: color 0.2s; font-size: 1.25rem; }
        .demo-nav-icons span:hover { color: #af101a; }
        .demo-btn-primary {
          background: #af101a; color: #fff; padding: 0.625rem 1.25rem;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
          border: none; cursor: pointer; border-radius: 2px; transition: background 0.15s, transform 0.15s;
        }
        .demo-btn-primary:hover { background: #d32f2f; }
        /* Hero */
        .demo-hero {
          position: relative; height: 921px; width: 100%; overflow: hidden; padding-top: 4rem;
        }
        .demo-hero-bg { position: absolute; inset: 0; }
        .demo-hero-bg img { width: 100%; height: 100%; object-fit: cover; }
        .demo-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.60), transparent);
        }
        .demo-hero-content {
          position: relative; height: 100%; max-width: 80rem; margin: 0 auto;
          padding: 0 2rem; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
        }
        .demo-hero-inner { max-width: 42rem; }
        .demo-hero-tag {
          display: inline-block; padding: 0.25rem 0.75rem; background: #af101a; color: #fff;
          font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1.5rem;
        }
        .demo-hero h1 {
          font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 800; color: #fff;
          line-height: 1.05; letter-spacing: -0.05em; margin: 0 0 1.5rem;
        }
        .demo-hero p {
          font-size: clamp(1.1rem, 2vw, 1.5rem); color: rgba(255,255,255,0.90);
          font-weight: 300; line-height: 1.6; margin: 0 0 2.5rem; max-width: 32rem;
        }
        .demo-hero-btns { display: flex; flex-wrap: wrap; gap: 1rem; }
        .demo-btn-hero-1 {
          background: #af101a; color: #fff; padding: 1rem 2rem; border: none; cursor: pointer;
          font-size: 0.875rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
          border-radius: 2px; transition: background 0.2s;
        }
        .demo-btn-hero-1:hover { background: #d32f2f; }
        .demo-btn-hero-2 {
          background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.20); color: #fff;
          padding: 1rem 2rem; cursor: pointer; font-size: 0.875rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px;
          backdrop-filter: blur(8px); transition: background 0.2s;
        }
        .demo-btn-hero-2:hover { background: rgba(255,255,255,0.20); }
        .demo-hero-dots {
          position: absolute; bottom: 3rem; left: 2rem; display: flex; align-items: center; gap: 0.75rem;
        }
        .demo-hero-dots .dot-active { width: 2rem; height: 6px; background: #af101a; border-radius: 9999px; }
        .demo-hero-dots .dot { width: 6px; height: 6px; background: rgba(255,255,255,0.40); border-radius: 9999px; }
        /* Partners */
        .demo-partners {
          background: #fff; padding: 3rem 2rem; border-bottom: 1px solid #eeeeee;
        }
        .demo-partners-inner {
          max-width: 80rem; margin: 0 auto;
          display: flex; flex-wrap: wrap; justify-content: space-around; align-items: center;
          gap: 3rem; opacity: 0.5; filter: grayscale(1); transition: all 0.7s;
        }
        .demo-partners-inner:hover { opacity: 1; filter: grayscale(0); }
        .demo-partners-inner img { height: 2.5rem; object-fit: contain; }
        /* Benefits */
        .demo-benefits { padding: 6rem 2rem; max-width: 80rem; margin: 0 auto; }
        .demo-benefits-header { margin-bottom: 4rem; }
        .demo-benefits-header h2 {
          font-size: 1.875rem; font-weight: 800; letter-spacing: -0.05em; color: #1a1c1c; margin: 0 0 1rem;
        }
        .demo-benefits-divider { width: 3rem; height: 4px; background: #af101a; }
        .demo-benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
        .demo-benefit-card {
          background: #fff; padding: 2rem; border-radius: 2px;
          box-shadow: 0px 20px 40px rgba(26,28,28,0.06);
          transition: transform 0.3s;
        }
        .demo-benefit-card:hover { transform: translateY(-8px); }
        .demo-benefit-icon {
          width: 3rem; height: 3rem; border-radius: 2px; background: rgba(175,16,26,0.10);
          display: flex; align-items: center; justify-content: center; color: #af101a; margin-bottom: 1.5rem;
        }
        .demo-benefit-icon span { font-size: 1.75rem; }
        .demo-benefit-card h3 { font-size: 1.125rem; font-weight: 700; margin: 0 0 0.75rem; }
        .demo-benefit-card p { font-size: 0.875rem; color: #475569; line-height: 1.6; margin: 0; }
        /* Vision */
        .demo-vision { background: #f3f3f3; padding: 8rem 2rem; overflow: hidden; }
        .demo-vision-inner {
          max-width: 80rem; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center; gap: 4rem;
        }
        @media (min-width: 768px) {
          .demo-vision-inner { flex-direction: row; }
        }
        .demo-vision-img-wrap { flex: 1; position: relative; }
        .demo-vision-blob {
          position: absolute; top: -3rem; left: -3rem; width: 16rem; height: 16rem;
          background: rgba(175,16,26,0.05); border-radius: 9999px; filter: blur(48px);
        }
        .demo-vision-img-wrap img {
          position: relative; z-index: 10; width: 100%; border-radius: 2px;
          box-shadow: 0px 20px 40px rgba(26,28,28,0.06); aspect-ratio: 4/5; object-fit: cover;
        }
        .demo-vision-badge {
          position: absolute; bottom: -2rem; right: -2rem; background: #af101a;
          padding: 3rem; z-index: 20; display: none;
        }
        @media (min-width: 1024px) { .demo-vision-badge { display: block; } }
        .demo-vision-badge p {
          color: #fff; font-size: 1.875rem; font-weight: 900; font-style: italic; letter-spacing: -0.05em; margin: 0;
        }
        .demo-vision-text { flex: 1; }
        .demo-vision-text .vision-eyebrow {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;
          color: #af101a; margin-bottom: 1rem; display: block;
        }
        .demo-vision-text h2 {
          font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; letter-spacing: -0.05em;
          color: #1a1c1c; line-height: 1; margin: 0 0 1.5rem;
        }
        .demo-vision-text .vision-desc {
          font-size: 1.25rem; color: #374151; line-height: 1.6; font-weight: 300; margin: 0 0 3rem;
        }
        .demo-vision-text h3 {
          font-size: 1.5rem; font-weight: 800; letter-spacing: -0.05em; color: #1a1c1c; margin: 0 0 1.5rem;
        }
        .demo-mission-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
        .demo-mission-list li { display: flex; align-items: flex-start; gap: 1rem; }
        .demo-mission-list span.material-symbols-outlined { color: #af101a; margin-top: 2px; }
        .demo-mission-list .mi-text { color: #475569; }
        /* Products */
        .demo-products { padding: 6rem 2rem; max-width: 80rem; margin: 0 auto; }
        .demo-products-header {
          display: flex; flex-direction: column; justify-content: space-between;
          align-items: flex-end; margin-bottom: 4rem; gap: 1.5rem;
        }
        @media (min-width: 768px) { .demo-products-header { flex-direction: row; } }
        .demo-products-header-left h2 {
          font-size: 2.25rem; font-weight: 800; letter-spacing: -0.05em; margin: 0 0 1rem;
        }
        .demo-products-header-left p { color: #475569; margin: 0; }
        .demo-products-header a {
          color: #af101a; font-weight: 700; font-size: 0.875rem; letter-spacing: 0.15em;
          text-transform: uppercase; text-decoration: none; border-bottom: 2px solid rgba(175,16,26,0.20);
          padding-bottom: 4px; transition: border-color 0.2s; white-space: nowrap;
        }
        .demo-products-header a:hover { border-color: #af101a; }
        .demo-products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
        .demo-product-card { cursor: pointer; }
        .demo-product-img {
          aspect-ratio: 1/1; background: #e2e2e2; overflow: hidden; margin-bottom: 1.5rem; border-radius: 2px;
        }
        .demo-product-img img {
          width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s;
        }
        .demo-product-card:hover .demo-product-img img { transform: scale(1.10); }
        .demo-product-info { display: flex; justify-content: space-between; align-items: flex-start; }
        .demo-product-info .tag {
          font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #af101a;
        }
        .demo-product-info h3 { font-size: 1.25rem; font-weight: 700; margin: 0.25rem 0 0; }
        .demo-product-info .arrow-icon { color: #94a3b8; font-size: 1.5rem; transition: color 0.2s; }
        .demo-product-card:hover .arrow-icon { color: #af101a; }
        /* Footer */
        .demo-footer {
          padding: 4rem 2rem 2rem; border-top: 1px solid #f1f5f9;
          background: #f8fafc; font-size: 0.875rem; line-height: 1.6;
        }
        .demo-footer-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem; max-width: 80rem; margin: 0 auto;
        }
        .demo-footer-brand { }
        .demo-footer-brand .brand-name { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; }
        .demo-footer-brand p { color: #475569; margin: 0 0 1.5rem; }
        .demo-footer-social { display: flex; gap: 1rem; }
        .demo-footer-social span { color: #94a3b8; cursor: pointer; transition: color 0.2s; }
        .demo-footer-social span:hover { color: #af101a; }
        .demo-footer-col h4 {
          font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          color: #0f172a; margin: 0 0 1.5rem;
        }
        .demo-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
        .demo-footer-col ul a { color: #475569; text-decoration: none; transition: color 0.2s; }
        .demo-footer-col ul a:hover { color: #af101a; }
        .demo-footer-contact { display: flex; flex-direction: column; gap: 1rem; }
        .demo-footer-contact-item { display: flex; align-items: flex-start; gap: 0.75rem; color: #475569; }
        .demo-footer-contact-item .material-symbols-outlined { color: #af101a; font-size: 1.125rem; margin-top: 2px; }
        .demo-btn-service {
          width: 100%; border: 1px solid #af101a; color: #af101a; padding: 0.75rem 1rem;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
          background: transparent; cursor: pointer; transition: background 0.2s, color 0.2s;
        }
        .demo-btn-service:hover { background: #af101a; color: #fff; }
        .demo-footer-bottom {
          max-width: 80rem; margin: 4rem auto 0; padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          display: flex; flex-direction: column; justify-content: space-between;
          align-items: center; gap: 1rem; color: #64748b; font-size: 0.75rem;
        }
        @media (min-width: 768px) { .demo-footer-bottom { flex-direction: row; } }
        .demo-footer-bottom-right { display: flex; gap: 1.5rem; }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <div className="demo-root">
        {/* TopNavBar */}
        <nav className="demo-nav">
          <div className="demo-nav-inner">
            <div className="demo-logo">RPN</div>
            <div className="demo-nav-links" style={{ display: 'flex' }}>
              <a href="#" className="active">Products</a>
              <a href="#">Services</a>
              <a href="#">About Us</a>
              <a href="#">News</a>
              <a href="#">Career</a>
              <a href="#">Contact</a>
            </div>
            <div className="demo-nav-actions">
              <div className="demo-nav-icons">
                <span className="material-symbols-outlined">language</span>
                <span className="material-symbols-outlined">search</span>
              </div>
              <button className="demo-btn-primary">Get a Quote</button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="demo-hero">
          <div className="demo-hero-bg">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjNUAJ3pETpCyfDes9vzCn5Et38rUcsK3YctfzM2scX1jKKuL6T7bC6zl5Lqdz21ICxUhj3T_ODW-Jd9W2HxgxCqYrz8LRSmnA1XLlbmrZrZFD1vVFPlVYe8AT_w6PAKcI0Brh8A2MdYPZxRifY4DyarMh3ICGvNDA11hwww_Sm1tvkq8Pvzx4B1N_Og2_5up_7bpHpM3kCTcJkH7Fwzh8q-Ck0Vm4KI49NipGzxemi_4QpQCzwtYJ5uuQhJKb8lcXsK6c6n1xsjCt"
              alt="Modern high-tech medical laboratory"
            />
            <div className="demo-hero-overlay"></div>
          </div>
          <div className="demo-hero-content">
            <div className="demo-hero-inner">
              <span className="demo-hero-tag">Medical Precision &amp; Excellence</span>
              <h1>Wide range of products.</h1>
              <p>Good quality products at affordable prices for a healthier tomorrow.</p>
              <div className="demo-hero-btns">
                <button className="demo-btn-hero-1">Explore Catalogue</button>
                <button className="demo-btn-hero-2">Our Services</button>
              </div>
            </div>
            <div className="demo-hero-dots">
              <div className="dot-active"></div>
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </header>

        {/* Partners */}
        <section className="demo-partners">
          <div className="demo-partners-inner">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoywm_2P7EHLCzOknam6kbjFUJwVzWExlUR4curfUj9PxP3Q-yXuMoHfYqzRqgTUckvqjZEuYevBAYUYaBKcO8ggslrK8HCTPpCVAtggYcngy1k3v7fXEkDCj23v7WeXGi_yBpNH72lsxNvmu3x8MQRkJ-DXik3dkAG9UsF7n5L76jvWWdNfRSK8K_MkHYhpzfNY0RfaIl5aupw_aHMwSqBId-Om-21bUNHTc0-FrPwyn2vSuregJM5vZWzBc6ZEVZ7U6MOnJ2ir2v" alt="Apex Logo" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcNRgs7S6gUsTTzfDoa-wL9VPi8JiDT1KZjWYy0WlCvXpWYg1JxCPZqlt17LBz5j-0wWLUxuZ9GCC41MEufloDO4x_25HNhz7ZWAA5KHu17u65yAgeKl5Wg1X-iOzaEoICQNV4Tcr3xJ6bGO1005jn3YA0VYLNHx-nMiar7i0UI-oXs3zv0bCjjnJSsRcAwneq1qvwPLLnQ4Fp-oOe-EJIBX48cxNCAoOVzCXq_Qi_oCmNrjJwv3yRkr7-QEISCFWv3yTRZP-FH3Mr" alt="MIR Logo" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMuyOHv-gebByOBcJkNxA1SJKp1olgZAcki9JDwrhnTYPP7Ls-ALNJTJarYUI-1yt8AI4phRSMUbqwMwXN8IZ3WJsz8900lyrvjmynta930wYlhm0gZ3cy7XA2oNPpD7P_SDTay74A1SWFZ34lw6eOsaNfW0GJAQ-khvITcaWMamKcS1TAi-Nmy5WBt78d_sZ3TL83vH07pD7wY3WNJOeYgvplJDOiqmygIPtR-3NCX6WoJkLgk4-j5OLsSROXQwhlJuxXqZMzE7Pm" alt="Corentec Logo" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUtcYgCa-oc9EPs11MAU2r_K6ufFCy6Nu1RDZX3v5AXQ-h55nNVkKWWZrkXVMKuN8Q9rHKyWzz4GVSBK3wqyvP1DkAn9OWaWbfMs7qhSEfpeGCZ9xdWaci68hyoV5SNiYEp12aXSe9r9AA_gI-ELSLGtCaitg8N7OeLAU-tEx_uDXX5dm5VOqCIFVRSK1RyFwpBPivWtnRMEZuLnfmi7KvRJrZqsJ1xqlLsWdFvX5DgoVjRHlbLec7GAYTKQX-2V94snCW8ukbqjSt" alt="Partner Logo" />
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuA37qHMUZ9buW-Y2btLAUie2l-KDR0KhPp0pz4u77V6yHQMwfRi50a12l1S_B1gF80gnL2oD9q26WbpXKDZiMeXKfiB9Rparv1V-els_EZCp_HSoh6IOHoDwPbFSFVBozkyJkuz288ZJAuyZje4wjVHR6M7VCHIHN8fruNWaMMop4i4PRezs0S51tP-T0ir8-o49ikbm5hdUsF_FNQZ3lyfyNEmmU7lwlhtaUSAnVSOEIlKq_qF3t2agxYZs6Fbw85RyQPpFfdniMaz" alt="Partner Logo" />
          </div>
        </section>

        {/* Benefits */}
        <section className="demo-benefits">
          <div className="demo-benefits-header">
            <h2>Why Choose ENDO Indonesia?</h2>
            <div className="demo-benefits-divider"></div>
          </div>
          <div className="demo-benefits-grid">
            {[
              { icon: 'health_and_safety', title: 'Health improvement', desc: 'Dedicated to elevating Indonesian healthcare standards with precision tools.' },
              { icon: 'workspace_premium', title: 'Qualified personnel', desc: 'Our experts are internationally certified to handle complex medical technology.' },
              { icon: 'hub', title: 'Wide network', desc: 'Connected across 34 provinces, reaching healthcare providers everywhere.' },
              { icon: 'local_shipping', title: 'Fast delivery', desc: 'Optimized logistics ensuring your medical equipment arrives safely and on time.' },
            ].map((b) => (
              <div className="demo-benefit-card" key={b.title}>
                <div className="demo-benefit-icon">
                  <span className="material-symbols-outlined">{b.icon}</span>
                </div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="demo-vision">
          <div className="demo-vision-inner">
            <div className="demo-vision-img-wrap">
              <div className="demo-vision-blob"></div>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBryVTILzmthJbWmwWzEtEH9qt69Kdx7dEd2ryNMptmgYybShKr8wgX9yEiluDF9QK6Xbb-ZurN4FUkHh90JWG_jfQYZArxU8m1NdOmcMeOu2rqzKM4Zk8cNye6lBkfXGdt_AEvsX_FayhbqZ1MRvYN15YRlZdf2V9ZUdT3RcXT5ulJ1DCGh4WFqn78XuXAdWKxxtxczkU3mpCYOL0FcLSyU8z6bfEqMIGLp4legaKl80YEr3XKJAWDWiwDk5nsgb5sFvjpBvAtm5bn"
                alt="Modern hospital sterile surgery room"
              />
              <div className="demo-vision-badge">
                <p>SINCE 2006</p>
              </div>
            </div>
            <div className="demo-vision-text">
              <span className="vision-eyebrow">The Core Purpose</span>
              <h2>Our Vision</h2>
              <p className="vision-desc">
                To be the leading partner in Indonesian healthcare transformation by providing world-class medical equipment and expertise.
              </p>
              <h3>Our Mission</h3>
              <ul className="demo-mission-list">
                <li>
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="mi-text">Provide high-quality medical devices at competitive prices to improve accessibility.</span>
                </li>
                <li>
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="mi-text">Ensure excellence in maintenance services through highly skilled technicians.</span>
                </li>
                <li>
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="mi-text">Bridge the gap between global innovations and local medical requirements.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="demo-products">
          <div className="demo-products-header">
            <div className="demo-products-header-left">
              <h2>Precision Instrumentation</h2>
              <p>Engineered for accuracy, designed for reliability. Explore our curated selection of medical advancements.</p>
            </div>
            <a href="#">View Full Catalogue</a>
          </div>
          <div className="demo-products-grid">
            {[
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMDwdGdMZWBN6-hL-j4ukPCtVfnZdFuAAeY2Wp03Keac11aRsm5a_CX1oBMjK5HZahiQfJT7EWG7ndOrv2yiUm8BW2IPD5yVuul2C08D31E6OIvs74ynPVR6H6UafV0bxqEB685JBMYLnvKZ1gMWmXwUWcajIhEJ0Au00NL_GLxxJc1gpwc7CrCSoxplO8gsEBFtHK5QYjpAIElAtesmNtOaTH4Cupjl6U4wFo9aOSmUT5q1XoKbmDoaVCG8N8gI0fjQlbBlVeWjnV',
                tag: 'Diagnostic Systems', title: 'Digital Patient Monitor',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCH-9132OYJ6e2aEwRUajesMYW8KV-MvBZzmisZpI2rkIfuaoXjIWwldIoRDmZ2HY0ojkhAAstGWBuYfSWPugDHqm9jQpTliayPz_pZV_0fXvk7cTburZm02WIYYqlFeg_YOUMfy9c3a3l7o_z9fbrDDAbX2cYIjPMEAQ4PxHcg9qNRdfTtg39Dgtgu83wP79yEWoFp_q862D-zAgbsNfr1mJBpNibKFTutc88ETH1U892Vn7YyZ6t3XyCvf2RtX-dg3RTHqAcLoGGt',
                tag: 'Surgical Tools', title: 'Endoscopic Precision Kit',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2nDaUkDdIraNFBKw_WCDAi_UsKZA73dWX_DtyvhanFZXSxoM9sxaoJoUC6PQLga8LrbwnoPmTeQZZ12w1OwlXOJml2fGiubjtRdvYZlR5uwg-YntwxJIi9rhPSIRY-QZ-cD8V22Rbl8yTJ42l70fnwFXtjXKk8xcpWzK2w-pMNkWlBV4Pc4qGRPm_leZipXoVhYTFrwc31VKr_MrHVshiR9yh-KKh1q4ExHKk69tsXSAvCEnEzVFjYIfbIxm9gemUpFCgJi1SH6KI',
                tag: 'Laboratory', title: 'Biomedical Analysis Unit',
              },
            ].map((p) => (
              <div className="demo-product-card" key={p.title}>
                <div className="demo-product-img">
                  <img src={p.img} alt={p.title} />
                </div>
                <div className="demo-product-info">
                  <div>
                    <div className="tag">{p.tag}</div>
                    <h3>{p.title}</h3>
                  </div>
                  <span className="material-symbols-outlined arrow-icon">arrow_outward</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="demo-footer">
          <div className="demo-footer-grid">
            <div className="demo-footer-brand">
              <div className="brand-name">ENDO Indonesia</div>
              <p>Trusted partner for high-quality medical equipment distribution and technical services across Indonesia since 2006.</p>
              <div className="demo-footer-social">
                <span className="material-symbols-outlined">social_leaderboard</span>
                <span className="material-symbols-outlined">share</span>
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>
            <div className="demo-footer-col">
              <h4>Main Categories</h4>
              <ul>
                <li><a href="#">Products</a></li>
                <li><a href="#">Maintenance Services</a></li>
                <li><a href="#">Quality Assurance</a></li>
              </ul>
            </div>
            <div className="demo-footer-col">
              <h4>Legal &amp; Support</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Contact Support</a></li>
              </ul>
            </div>
            <div className="demo-footer-col">
              <h4>Get In Touch</h4>
              <div className="demo-footer-contact">
                <div className="demo-footer-contact-item">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>Jakarta, Indonesia HQ</span>
                </div>
                <div className="demo-footer-contact-item">
                  <span className="material-symbols-outlined">phone</span>
                  <span>+62 (21) 1234-5678</span>
                </div>
                <button className="demo-btn-service">Request Service</button>
              </div>
            </div>
          </div>
          <div className="demo-footer-bottom">
            <p>© 2026 RPN. All Rights Reserved. Medical Precision &amp; Excellence.</p>
            <div className="demo-footer-bottom-right">
              <span>ISO 9001:2015 Certified</span>
              <span>Kemenkes RI Licensed</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
