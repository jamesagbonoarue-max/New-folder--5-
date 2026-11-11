import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  GraduationCap,
  Mail,
  MessageCircle,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import './App.css';

const MANUAL_BACKEND_URL = 'https://new-folder-5-olcz.onrender.com';
const VERCEL_FRONTEND_URL = 'https://school-blog-app.vercel.app';
const normalizeApiBase = (value) => {
  const trimmed = String(value || '').replace(/\/+$/, '');
  if (!trimmed) return 'https://new-folder-5-olcz.onrender.com/api';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};
const API_BASES = [MANUAL_BACKEND_URL, import.meta.env.VITE_API_URL].filter(Boolean).map(normalizeApiBase);
const API_BASE = API_BASES[0] || 'https://new-folder-5-olcz.onrender.com/api';

const FRONTEND_ORIGIN = import.meta.env.VITE_FRONTEND_URL || VERCEL_FRONTEND_URL;

const originalAxiosMethods = {
  get: axios.get.bind(axios),
  post: axios.post.bind(axios),
  put: axios.put.bind(axios),
  delete: axios.delete.bind(axios),
  patch: axios.patch.bind(axios),
};

const shouldRetryWithFallback = (error) => {
  if (!error) return false;
  const message = String(error.message || '');
  return !error.response || error.response.status === 0 || error.code === 'ERR_NETWORK' || message.includes('Network Error') || message.includes('Failed to fetch');
};

const buildRequestUrl = (base, requestedUrl) => {
  const normalizedBase = String(base || '').replace(/\/+$/, '');
  const rawUrl = String(requestedUrl || '').trim();

  if (!rawUrl) return normalizedBase;

  if (/^https?:\/\//i.test(rawUrl)) {
    const parsed = new URL(rawUrl);
    const normalizedPath = parsed.pathname.replace(/^\/+api\/+/, '/');
    return `${normalizedBase}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}${parsed.search}`;
  }

  const normalizedPath = rawUrl.replace(/^\/+api\/+/, '/');
  return `${normalizedBase}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
};

const requestWithFallback = async (method, url, payload, config = {}) => {
  let currentUrl = url;
  console.log('[frontend-api]', { method: method.toUpperCase(), requestedUrl: currentUrl, apiBases: API_BASES, frontendOrigin: FRONTEND_ORIGIN });

  for (let index = 0; index < API_BASES.length; index += 1) {
    const base = API_BASES[index];
    const requestUrl = buildRequestUrl(base, currentUrl);

    console.log('[frontend-api-attempt]', { attempt: index + 1, url: requestUrl, base });

    try {
      if (method === 'get') {
        const response = await originalAxiosMethods.get(requestUrl, config);
        console.log('[frontend-api-success]', { url: requestUrl, status: response?.status });
        return response;
      }
      if (method === 'post') {
        const response = await originalAxiosMethods.post(requestUrl, payload, config);
        console.log('[frontend-api-success]', { url: requestUrl, status: response?.status });
        return response;
      }
      if (method === 'put') {
        const response = await originalAxiosMethods.put(requestUrl, payload, config);
        console.log('[frontend-api-success]', { url: requestUrl, status: response?.status });
        return response;
      }
      if (method === 'patch') {
        const response = await originalAxiosMethods.patch(requestUrl, payload, config);
        console.log('[frontend-api-success]', { url: requestUrl, status: response?.status });
        return response;
      }
      const response = await originalAxiosMethods.delete(requestUrl, config);
      console.log('[frontend-api-success]', { url: requestUrl, status: response?.status });
      return response;
    } catch (error) {
      console.error('[frontend-api-error]', {
        url: requestUrl,
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data,
      });
      if (!shouldRetryWithFallback(error) || index === API_BASES.length - 1) {
        throw error;
      }
      currentUrl = requestUrl;
    }
  }

  return null;
};

axios.get = (url, config) => requestWithFallback('get', url, null, config);
axios.post = (url, payload, config) => requestWithFallback('post', url, payload, config);
axios.put = (url, payload, config) => requestWithFallback('put', url, payload, config);
axios.delete = (url, config) => requestWithFallback('delete', url, null, config);
axios.patch = (url, payload, config) => requestWithFallback('patch', url, payload, config);
axios.defaults.withCredentials = true;

const formatDate = (value) => {
  if (!value) return 'Not yet published';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const publishedNews = (list = []) => list.filter((item) => item.status !== 'draft');

function LoadingImage({ src, alt, className = '', wrapperClassName = '', priority = false }) {
  const [imageStatus, setImageStatus] = useState({ src: null, status: 'loading' });
  const status = imageStatus.src === src ? imageStatus.status : 'loading';

  return (
    <span
      className={`image-loading-shell ${wrapperClassName} is-${status}`.trim()}
      role={status === 'error' ? 'img' : undefined}
      aria-label={status === 'error' ? (alt || 'Image unavailable') : undefined}
      aria-hidden={status === 'error' && !alt ? true : undefined}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setImageStatus({ src, status: 'loaded' })}
        onError={() => setImageStatus({ src, status: 'error' })}
      />
    </span>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`;

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link to="/" className="brand" aria-label="De Genius Talents International School home">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <span className="brand-name">DE GENIUS TALENTS</span>
            <small>International School · DGTIS</small>
          </div>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="main-navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav
          id="main-navigation"
          className={`main-nav ${open ? 'open' : ''}`}
          onClick={() => setOpen(false)}
        >
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/news" className={linkClass}>
            News
          </NavLink>
          <NavLink to="/events" className={linkClass}>
            Events
          </NavLink>
          <NavLink to="/clubs" className={linkClass}>
            Clubs
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            Contact
          </NavLink>
          <a
            href="https://de-gunius-talents-ai.vercel.app/"
            className="nav-link external-link"
            target="_blank"
            rel="noreferrer"
          >
            AI Assistant
          </a>
          <NavLink to="/admin" className="admin-link">
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand footer-brand">
            <div className="brand-mark">
              <GraduationCap size={22} />
            </div>
            <div>
              <span className="brand-name">DE GENIUS TALENTS</span>
              <small>International School · DGTIS</small>
            </div>
          </div>
          <p>
            Raising Talented Intellects. There's a genius in every child.
          </p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/news">Latest News</Link></li>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/clubs">Clubs</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <ul>
            <li><Mail size={15} /><a href="mailto:info@dgtis.org.ng">info@dgtis.org.ng</a></li>
            <li><Phone size={15} /><a href="tel:+2348186866815">0818 686 6815</a></li>
            <li><Phone size={15} /><a href="tel:+2348090677737">0809 067 7737</a></li>
            <li><Globe size={15} /><a href="https://dgtis.org.ng" target="_blank" rel="noreferrer">dgtis.org.ng</a></li>
          </ul>
        </div>

        <div>
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="https://www.facebook.com/DeGeniusTalents" target="_blank" rel="noreferrer" aria-label="Facebook"><Globe size={18} /></a>
            <a href="https://www.instagram.com/de_genius_talents/" target="_blank" rel="noreferrer" aria-label="Instagram"><MessageCircle size={18} /></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 De Genius Talents International School (DGTIS). Established 2004.</div>
        <div className="footer-attribution">
          Powered by Edubuilder · <a href="mailto:jamesagbonoarue@gmail.com">jamesagbonoarue@gmail.com</a> · <a href="tel:+2349039376584">09039376584</a>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}

function HomePage() {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/news`),
      axios.get(`${API_BASE}/events`),
      axios.get(`${API_BASE}/clubs`),
      axios.get(`${API_BASE}/announcements`),
    ])
      .then(([newsResponse, eventResponse, clubResponse, announcementResponse]) => {
        setNews(newsResponse.data || []);
        setEvents(eventResponse.data || []);
        setClubs(clubResponse.data || []);
        setAnnouncements(announcementResponse.data || []);
      })
      .catch(() => {
        setNews([]);
        setEvents([]);
        setClubs([]);
        setAnnouncements([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(
    () => publishedNews(news).filter((item) => item.featured).slice(0, 3),
    [news]
  );
  const latest = useMemo(() => publishedNews(news).slice(0, 4), [news]);
  const upcomingEvents = useMemo(
    () => (events || []).filter((event) => new Date(event.date) >= new Date()).slice(0, 3),
    [events]
  );

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={16} /> Raising Talented Intellects</span>
            <h1>There's a genius in every child.</h1>
            <p>
              De Genius Talents International School nurtures each child's intellectual, social, moral and creative abilities—building confidence and preparing learners for the future.
            </p>
            <div className="hero-actions">
              <Link to="/news" className="primary-btn">Explore News <ArrowRight size={16} /></Link>
              <Link to="/about" className="secondary-btn">Our School</Link>
              <a href="https://de-gunius-talents-ai.vercel.app/" className="secondary-btn" target="_blank" rel="noreferrer">
                School AI Assistant <ExternalLink size={16} />
              </a>
            </div>
            <div className="hero-values">
              <span>Learn with purpose</span>
              <span>Grow together</span>
              <span>Make your mark</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-card highlight-card">
              {featured[0]?.image && (
                <LoadingImage
                  className="hero-feature-image"
                  wrapperClassName="hero-image-shell"
                  src={featured[0].image}
                  alt=""
                  priority
                />
              )}
              <div className="highlight-copy">
                <span className="card-badge">Our school · Established 2004</span>
                <h3>{featured[0]?.title || 'A first-class citadel of learning'}</h3>
                <p>{featured[0]?.subtitle || 'Discover a child-centred learning community where every talent can grow.'}</p>
                <div className="panel-meta">
                  <span><CalendarDays size={14} /> {formatDate(featured[0]?.publishedDate)}</span>
                  <span><Bell size={14} /> {featured[0]?.category || 'Academics'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="page-shell">
        <section className="container school-intro section-block">
          <div className="school-intro-copy">
            <span className="eyebrow muted"><GraduationCap size={16} /> De Genius Talents International School</span>
            <h2>Curiosity, character and confidence for a changing world.</h2>
            <p>Since 2004, DGTIS has helped children discover their strengths and grow into skilled, responsible and globally minded citizens.</p>
            <Link to="/about" className="text-link">Discover our school <ArrowRight size={16} /></Link>
          </div>
          <div className="school-motto">
            <span>Our motto</span>
            <strong>“There's a genius in every child.”</strong>
            <span>Preschool · Primary · Secondary</span>
          </div>
        </section>

        <section className="container section-block">
          <div className="section-header">
            <div>
              <span className="eyebrow muted"><Newspaper size={16} /> Featured school news</span>
              <h2>Latest stories from campus</h2>
            </div>
            <Link to="/news" className="text-link">View all news</Link>
          </div>

          <div className="news-grid featured-grid">
            {featured.map((item) => (
              <article className="news-card large" key={item._id}>
                {item.image && <LoadingImage src={item.image} alt={item.title} />}
                <div className="news-content">
                  <span className="news-tag">{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle || item.content?.slice(0, 120)}</p>
                  <div className="meta-row">
                    <span>{item.author}</span>
                    <span>{formatDate(item.publishedDate)}</span>
                  </div>
                  <Link to={`/news/${item._id}`} className="read-more">Read more</Link>
                </div>
              </article>
            ))}
            {featured.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading featured stories…' : 'School news will appear here when published.'}</p>}
          </div>
        </section>

        <section className="container section-block light-block">
          <div className="section-header">
            <div>
              <span className="eyebrow muted"><BookOpen size={16} /> Latest updates</span>
              <h2>Fresh from the school community</h2>
            </div>
          </div>

          <div className="news-grid stacked-grid">
            {latest.map((item) => (
              <article className="news-card compact" key={item._id}>
                {item.image && <LoadingImage src={item.image} alt={item.title} />}
                <div className="news-content">
                  <span className="news-tag">{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle || item.content?.slice(0, 90)}</p>
                  <div className="meta-row">
                    <span>{formatDate(item.publishedDate)}</span>
                    <Link to={`/news/${item._id}`} className="read-more">Read more</Link>
                  </div>
                </div>
              </article>
            ))}
            {latest.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading school updates…' : 'There are no published updates yet.'}</p>}
          </div>
        </section>

        <section className="container section-block">
          <div className="section-header">
            <div>
              <span className="eyebrow muted"><CalendarDays size={16} /> Upcoming events</span>
              <h2>Campus experiences and celebrations</h2>
            </div>
            <Link to="/events" className="text-link">See all events</Link>
          </div>

          <div className="event-grid">
            {upcomingEvents.map((event) => (
              <article className="event-card" key={event._id}>
                {event.image && <LoadingImage src={event.image} alt={event.title} />}
                <div className="event-content">
                  <span className="news-tag">{event.status}</span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <ul className="event-meta-list">
                    <li><CalendarDays size={15} /> {formatDate(event.date)}</li>
                    <li><Bell size={15} /> {event.time}</li>
                    <li><MapPin size={15} /> {event.location}</li>
                  </ul>
                </div>
              </article>
            ))}
            {upcomingEvents.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading events…' : 'No upcoming events have been announced.'}</p>}
          </div>
        </section>

        <section className="container section-block light-block">
          <div className="section-header">
            <div>
              <span className="eyebrow muted"><Users size={16} /> Clubs and activities</span>
              <h2>Where students grow and belong</h2>
            </div>
          </div>

          <div className="club-grid">
            {clubs.slice(0, 4).map((club) => (
              <article className="club-card" key={club._id}>
                {club.image && <LoadingImage src={club.image} alt={club.name} />}
                <div className="club-content">
                  <span className="news-tag">{club.category}</span>
                  <h3>{club.name}</h3>
                  <p>{club.description}</p>
                </div>
              </article>
            ))}
            {clubs.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading clubs…' : 'Club information will appear here when available.'}</p>}
          </div>
        </section>

        <section className="container section-block announcement-wrap">
          <div className="announcement-panel">
            <div>
              <span className="eyebrow muted"><ShieldCheck size={16} /> Important updates</span>
              <h2>Featured announcements</h2>
            </div>
            <div className="announcement-list">
              {announcements.slice(0, 3).map((item) => (
                <div className="announcement-item" key={item._id}>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.message}</p>
                  </div>
                  <span>{formatDate(item.date)}</span>
                </div>
              ))}
              {announcements.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading announcements…' : 'There are no current announcements.'}</p>}
            </div>
          </div>
        </section>

        <section className="container section-block newsletter-section">
          <div className="newsletter-box">
            <div>
              <span className="eyebrow muted"><Mail size={16} /> School newsletter</span>
              <h2>Stay connected with campus stories and important updates.</h2>
            </div>
            <form className="newsletter-form">
              <input type="email" placeholder="Your email address" aria-label="Email address" />
              <button type="submit" className="primary-btn">Subscribe</button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

function NewsPage() {
  const [news, setNews] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState(['All']);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await axios.get(`${API_BASE}/news`, {
          params: {
            page,
            limit: 6,
            search: query.trim(),
            ...(category === 'All' ? {} : { category }),
          },
        });
        if (!active) return;
        setNews(response.data.items || []);
        setCategories(['All', ...(response.data.categories || [])]);
        setTotalPages(Math.max(1, response.data.pages || 1));
      } catch {
        if (!active) return;
        setNews([]);
        setLoadError('Could not load news. Please try again later.');
      } finally {
        if (active) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, page, query]);

  return (
    <main className="page-shell container content-page">
      <div className="page-intro">
        <span className="eyebrow muted"><Newspaper size={16} /> Newsroom</span>
        <h1>School news and stories</h1>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search news articles"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        >
          {categories.map((item) => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state" role="status">Loading news…</div>
      ) : loadError ? (
        <div className="empty-state" role="alert">{loadError}</div>
      ) : news.length === 0 ? (
        <div className="empty-state">No news articles match your filters yet.</div>
      ) : (
        <div className="news-grid legacy-grid">
          {news.map((item) => (
            <article className="news-card compact" key={item._id}>
              {item.image && <LoadingImage src={item.image} alt={item.title} />}
              <div className="news-content">
                <span className="news-tag">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.subtitle || item.content?.slice(0, 110)}</p>
                <div className="meta-row">
                  <span>{formatDate(item.publishedDate)}</span>
                  <Link to={`/news/${item._id}`} className="read-more">Read more</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pagination">
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading}>
          Next
        </button>
      </div>
    </main>
  );
}

function NewsDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      axios.get(`${API_BASE}/news`),
      axios.get(`${API_BASE}/news/${id}`),
    ])
      .then(([newsResponse, articleResponse]) => {
        const newsList = newsResponse.data || [];
        const selected = articleResponse.data;
        setArticle(selected);

        const related = publishedNews(newsList)
          .filter((item) => item._id !== selected._id && item.category === selected.category)
          .slice(0, 3);

        setRelatedNews(related);
      })
      .catch(() => {
        setArticle(null);
        setRelatedNews([]);
      });
  }, [id]);

  if (!article) {
    return <main className="page-shell container content-page"><div className="empty-state">Loading article...</div></main>;
  }

  return (
    <main className="page-shell container content-page article-page">
      <article className="article-hero">
        {article.image && <LoadingImage src={article.image} alt={article.title} wrapperClassName="article-image-shell" priority />}
        <div className="article-header">
          <span className="news-tag">{article.category}</span>
          <h1>{article.title}</h1>
          <p className="article-subtitle">{article.subtitle}</p>
          <div className="article-meta">
            <span>By {article.author}</span>
            <span>{formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </article>

      <div className="article-body">
        <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />

        <aside className="share-panel">
          <h3>Share this article</h3>
          <div className="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=#" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=#" target="_blank" rel="noreferrer">X</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=#" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </aside>
      </div>

      <section className="related-section">
        <div className="section-header">
          <h2>Related stories</h2>
        </div>
        <div className="news-grid stacked-grid">
          {relatedNews.map((item) => (
            <article className="news-card compact" key={item._id}>
              {item.image && <LoadingImage src={item.image} alt={item.title} />}
              <div className="news-content">
                <span className="news-tag">{item.category}</span>
                <h3>{item.title}</h3>
                <div className="meta-row">
                  <span>{formatDate(item.publishedDate)}</span>
                  <Link to={`/news/${item._id}`} className="read-more">Read more</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/events`)
      .then((response) => setEvents(response.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const upcomingEvents = events.filter((event) => new Date(event.date) >= new Date());
  const pastEvents = events.filter((event) => new Date(event.date) < new Date());

  return (
    <main className="page-shell container content-page">
      <div className="page-intro">
        <span className="eyebrow muted"><CalendarDays size={16} /> Events</span>
        <h1>Upcoming and recent school events</h1>
      </div>

      <section className="section-block">
        <div className="section-header">
          <h2>Upcoming events</h2>
        </div>
        <div className="event-grid">
          {upcomingEvents.length === 0 ? <div className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading events…' : 'No upcoming events scheduled right now.'}</div> : upcomingEvents.map((event) => (
            <article className="event-card" key={event._id}>
              {event.image && <LoadingImage src={event.image} alt={event.title} />}
              <div className="event-content">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <ul className="event-meta-list">
                  <li><CalendarDays size={15} /> {formatDate(event.date)}</li>
                  <li><Bell size={15} /> {event.time}</li>
                  <li><MapPin size={15} /> {event.location}</li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <h2>Past events</h2>
        </div>
        <div className="event-grid">
          {pastEvents.length === 0 ? <div className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading events…' : 'No past events available.'}</div> : pastEvents.map((event) => (
            <article className="event-card muted-card" key={event._id}>
              {event.image && <LoadingImage src={event.image} alt={event.title} />}
              <div className="event-content">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <ul className="event-meta-list">
                  <li><CalendarDays size={15} /> {formatDate(event.date)}</li>
                  <li><MapPin size={15} /> {event.location}</li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/clubs`)
      .then((response) => setClubs(response.data || []))
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-shell container content-page">
      <div className="page-intro">
        <span className="eyebrow muted"><Users size={16} /> Clubs</span>
        <h1>Explore, create and grow together.</h1>
        <p className="page-lede">From STEM and cooking to other educational and creative clubs, students can build teamwork, leadership, practical skills and confidence while exploring their interests.</p>
      </div>

      <div className="club-grid detail-grid">
        {clubs.map((club) => (
          <article className="club-card" key={club._id}>
            {club.image && <LoadingImage src={club.image} alt={club.name} />}
            <div className="club-content">
              <span className="news-tag">{club.category}</span>
              <h3>{club.name}</h3>
              <p>{club.description}</p>
            </div>
          </article>
        ))}
        {clubs.length === 0 && <p className="empty-state" role={loading ? 'status' : undefined}>{loading ? 'Loading clubs…' : 'Club information will appear here when available.'}</p>}
      </div>
    </main>
  );
}

function AboutPage() {
  return (
    <main className="page-shell container content-page about-page">
      <div className="page-intro">
        <span className="eyebrow muted"><GraduationCap size={16} /> About DGTIS · Established 2004</span>
        <h1>Raising talented intellects since 2004.</h1>
        <p className="page-lede">
          We nurture children's intellectual, social, moral and creative abilities in a supportive environment where every learner can discover talents, develop confidence and prepare for the future.
        </p>
      </div>

      <section className="about-grid mission-grid">
        <div className="info-panel">
          <h3>Our mission</h3>
          <p>Raise intellectually gifted boys and girls who will positively influence society through discipline, diligence and all-round excellence.</p>
        </div>
        <div className="info-panel">
          <h3>Our vision</h3>
          <p>Become a first-class citadel of learning that nurtures potentials and provides opportunities for learners to grow into outstanding children, skillful individuals and responsible global citizens.</p>
        </div>
      </section>

      <section className="about-section why-dgtis">
        <div><span className="eyebrow muted">Why choose DGTIS</span><h2>Excellent learning, strong character and room to thrive.</h2></div>
        <p>A stimulating and safe learning environment, quality teaching, interactive methods and innovative educational programmes bring academic learning and character development together. Practical experiences and technology learning help students discover their individual talents and build skills for the future.</p>
      </section>

      <section className="about-section">
        <div className="section-header">
          <div><span className="eyebrow muted">Learning at DGTIS</span><h2>Programmes for every stage and ambition.</h2></div>
        </div>
        <div className="detail-card-grid">
          <article className="detail-card"><span>01</span><h3>Preschool</h3><p>A supportive start for young learners to explore, build confidence and develop foundational skills.</p></article>
          <article className="detail-card"><span>02</span><h3>Primary education</h3><p>A broad foundation that nurtures curiosity, essential knowledge and well-rounded development.</p></article>
          <article className="detail-card"><span>03</span><h3>Secondary education</h3><p>Learning that prepares students for further study, responsible citizenship and future opportunities.</p></article>
          <article className="detail-card"><span>04</span><h3>Coding & robotics</h3><p>Practical technology experiences that build creativity, problem-solving and computational thinking.</p></article>
          <article className="detail-card"><span>05</span><h3>WAEC & UTME preparation</h3><p>Preparation classes support learners working toward these examinations. Contact the school for current details.</p></article>
          <article className="detail-card"><span>06</span><h3>IJMB & JUPEB</h3><p>Programme information, availability and entry requirements are provided by the school administration.</p></article>
        </div>
      </section>

      <section className="about-section philosophy-panel">
        <div>
          <span className="eyebrow muted">How we teach</span>
          <h2>Child-centred, hands-on and full of possibility.</h2>
          <p>Our enriched educational programme encourages curiosity, exploration, creativity and personal development. Interactive teaching and practical activities help learners participate, make discoveries and apply what they learn.</p>
        </div>
        <div className="curriculum-block">
          <h3>Curriculum areas</h3>
          <ul className="tag-list">
            <li>Computer Science</li><li>Mathematics</li><li>Science</li><li>Languages</li><li>Humanities</li><li>Creative Arts</li>
          </ul>
          <p>Students build logical reasoning and real-world maths skills, explore scientific ideas, grow communication and cultural understanding, and express themselves through dance, drama, music and painting.</p>
        </div>
      </section>

      <section className="about-section">
        <div className="section-header">
          <div><span className="eyebrow muted">Beyond the classroom</span><h2>Talents grow through doing.</h2></div>
        </div>
        <div className="about-grid">
          <div className="info-panel"><h3>Clubs & co-curricular life</h3><p>STEM, cooking and other educational and creative clubs let students explore interests, practise teamwork and leadership, and build practical skills and confidence.</p></div>
          <div className="info-panel"><h3>Sports, debate & the arts</h3><p>Students can pursue sports they enjoy and take part in inter-school debates and quizzes, dance, drama, music and painting. The annual inter-school debate and quiz symposium gives students from different schools a platform to share opinions on important national issues.</p></div>
        </div>
      </section>

      <section className="about-section facilities-panel">
        <div><span className="eyebrow muted">Our learning environment</span><h2>Spaces that bring learning to life.</h2></div>
        <ul className="tag-list facility-tags">
          <li>Science & vocational laboratories</li><li>ICT room</li><li>Sports facilities</li><li>Montessori instruction facilities</li><li>Healing bay</li><li>Music & creative arts hub</li><li>CCTV security systems</li>
        </ul>
      </section>

      <section className="about-section values-section">
        <div><span className="eyebrow muted">What guides us</span><h2>Values that shape every learner.</h2></div>
        <ul className="values-grid">
          <li>Dedication to God</li><li>Excellence in results</li><li>Genuineness in service</li><li>Exemplary staff conduct</li><li>Integrity</li><li>Accountability</li><li>Empathy</li><li>Nurturing future leaders</li><li>Sustainable educational growth</li>
        </ul>
      </section>

      <section className="about-grid school-day-grid">
        <div className="info-panel">
          <h3>A day at DGTIS</h3>
          <ul className="schedule-list">
            <li><strong>7:00–7:40 a.m.</strong><span>School assembly</span></li>
            <li><strong>After assembly</strong><span>Academic activities begin</span></li>
            <li><strong>3:20 p.m.</strong><span>School closes</span></li>
            <li><strong>8:00 a.m.–5:00 p.m.</strong><span>Main office hours</span></li>
          </ul>
          <p>Please contact the school to confirm office availability on public holidays and during school breaks.</p>
        </div>
        <div className="info-panel">
          <h3>School leadership & community</h3>
          <p>Bayo Ayoade is identified by the school as Director of Studies. DGTIS values partnership with parents through its Parent-Teacher and Friends Association (PTFA), supporting children's academic progress, character development and well-being.</p>
          <p>Contact the school for information about PTFA activities and membership.</p>
        </div>
      </section>

      <div className="about-cta">
        <div><span className="eyebrow">Raising Talented Intellects</span><h2>Discover the right opportunity for your child.</h2></div>
        <Link to="/contact" className="primary-btn">Contact admissions <ArrowRight size={16} /></Link>
      </div>
    </main>
  );
}

function ContactPage() {
  return (
    <main className="page-shell container content-page contact-page">
      <div className="page-intro">
        <span className="eyebrow muted"><Mail size={16} /> Contact & admissions</span>
        <h1>Let's talk about your child's next step.</h1>
        <p className="page-lede">Admissions are open. Contact the school for current requirements and to arrange a visit.</p>
      </div>

      <div className="contact-grid">
        <div className="info-panel">
          <h3>Speak with the school</h3>
          <ul className="contact-list">
            <li><Mail size={15} /><a href="mailto:info@dgtis.org.ng">info@dgtis.org.ng</a></li>
            <li><Mail size={15} /><a href="mailto:degeniustalents@gmail.com">degeniustalents@gmail.com</a></li>
            <li><Phone size={15} /><a href="tel:+2348186866815">0818 686 6815</a></li>
            <li><Phone size={15} /><a href="tel:+2348090677737">0809 067 7737</a></li>
            <li><Globe size={15} /><a href="https://dgtis.org.ng" target="_blank" rel="noreferrer">Visit dgtis.org.ng <ExternalLink size={14} /></a></li>
          </ul>
        </div>
        <div className="info-panel admissions-panel">
          <h3>Admissions & school visits</h3>
          <p>Families are welcome to contact the administration to ask about requirements for the intended class, fees, payment information, admission dates and availability, or required documents. These details may change, so please confirm them directly with the school.</p>
          <p>Arrange a visit to learn about the school's environment, facilities and programmes. The management portal supports student information, academic records, accounts and administrative operations; parents can ask the school which portal features are currently available to them.</p>
          <p><strong>Main office:</strong> 8:00 a.m.–5:00 p.m. Contact the school to confirm availability during public holidays or school breaks.</p>
          <div className="contact-actions">
            <a className="primary-btn" href="mailto:info@dgtis.org.ng">Email admissions <ArrowRight size={16} /></a>
            <a className="text-link" href="https://www.facebook.com/DeGeniusTalents" target="_blank" rel="noreferrer">Facebook <ExternalLink size={14} /></a>
            <a className="text-link" href="https://www.instagram.com/de_genius_talents/" target="_blank" rel="noreferrer">Instagram <ExternalLink size={14} /></a>
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginDetails, setLoginDetails] = useState({ identifier: '', password: '' });
  const [authStage, setAuthStage] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const newsFormRef = useRef(null);
  const eventFormRef = useRef(null);
  const clubFormRef = useRef(null);
  const announcementFormRef = useRef(null);
  const [editing, setEditing] = useState({ news: null, event: null, club: null, announcement: null });
  const [clubForm, setClubForm] = useState({ name: '', description: '', category: 'School Life', image: '', imagePublicId: '' });
  const [departmentName, setDepartmentName] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    username: '',
    email: '',
    department: '',
    role: 'admin',
    permissions: [],
  });
  const [newsForm, setNewsForm] = useState({
    title: '',
    subtitle: '',
    content: '',
    category: 'Academics',
    author: 'School Editorial Team',
    image: '',
    imagePublicId: '',
    featured: false,
    status: 'draft',
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    image: '',
    imagePublicId: '',
    registrationLink: '',
    featured: false,
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    featured: false,
  });

  const canManageFor = (currentAdmin, permission) =>
    currentAdmin.role === 'super_admin' || currentAdmin.permissions?.includes(permission);

  const loadDashboard = useCallback(async (currentAdmin) => {
    if (!currentAdmin) return;
    try {
      const [newsResponse, eventResponse, clubResponse, announcementResponse, statsResponse] = await Promise.all([
        axios.get(`${API_BASE}/news${canManageFor(currentAdmin, 'news:write') ? '?status=all' : ''}`),
        axios.get(`${API_BASE}/events${canManageFor(currentAdmin, 'events:write') ? '?status=all' : ''}`),
        axios.get(`${API_BASE}/clubs${canManageFor(currentAdmin, 'clubs:write') ? '?status=all' : ''}`),
        axios.get(`${API_BASE}/announcements${canManageFor(currentAdmin, 'announcements:write') ? '?status=all' : ''}`),
        axios.get(`${API_BASE}/admin/dashboard`),
      ]);
      setNews(newsResponse.data || []);
      setEvents(eventResponse.data || []);
      setClubs(clubResponse.data || []);
      setAnnouncements(announcementResponse.data || []);
      setDashboardStats(statsResponse.data);
      if (currentAdmin.role === 'super_admin') {
        const [adminResponse, departmentResponse] = await Promise.all([
          axios.get(`${API_BASE}/admin`),
          axios.get(`${API_BASE}/departments`),
        ]);
        setAdministrators(adminResponse.data || []);
        setDepartments(departmentResponse.data || []);
      }
      setFormError('');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not load dashboard data.');
    }
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE}/auth/me`)
      .then((response) => {
        setAdmin(response.data.admin);
        loadDashboard(response.data.admin);
      })
      .catch((error) => {
        if (error.response?.status !== 401) {
          setAuthError(error.response?.data?.message || 'Could not verify your session.');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [loadDashboard]);

  useEffect(() => {
    if (authStage !== 'verify' || resendCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => setResendCountdown((remaining) => remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [authStage, resendCountdown]);

  const stats = {
    publishedNews: dashboardStats?.publishedNews ?? publishedNews(news).length,
    draftArticles: dashboardStats?.draftNews ?? news.filter((item) => item.status === 'draft').length,
    upcomingEvents: dashboardStats?.upcomingEvents ?? events.filter((event) => new Date(event.date) >= new Date()).length,
    publishedAnnouncements: dashboardStats?.publishedAnnouncements ?? announcements.length,
    totalAdmins: dashboardStats?.totalAdmins ?? 0,
    totalClubs: dashboardStats?.totalClubs ?? clubs.length,
    activities: dashboardStats?.recentActivity ?? [],
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        ...loginDetails,
        email: loginDetails.identifier,
      });
      setAdmin(response.data.admin);
      loadDashboard(response.data.admin);
      setLoginDetails({ identifier: '', password: '' });
    } catch (error) {
      console.error('[login-failed]', {
        url: `${API_BASE}/auth/login`,
        identifier: loginDetails.identifier,
        status: error?.response?.status,
        message: error?.message,
        serverMessage: error?.response?.data?.message,
        fullError: error,
      });
      setAuthError(error.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setAuthError('');
    setRecoveryNotice('');
    setRecoveryLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email: resetEmail });
      setRecoveryNotice(response.data.message);
      setResetCode('');
      setResendCountdown(60);
      setAuthStage('verify');
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Could not process the recovery request. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyResetCode = async (event) => {
    event.preventDefault();
    setAuthError('');
    setRecoveryNotice('');
    setRecoveryLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/verify-reset-code`, {
        email: resetEmail,
        code: resetCode,
      });
      setResetToken(response.data.resetToken);
      setAuthStage('reset');
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Could not verify the code. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setAuthError('');
    setRecoveryNotice('');
    setRecoveryLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/resend-reset-code`, { email: resetEmail });
      setRecoveryNotice(response.data.message);
      setResetCode('');
      setResendCountdown(60);
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Could not resend the code. Please try again later.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setAuthError('');
    setRecoveryNotice('');
    if (newPassword !== confirmNewPassword) {
      setAuthError('The passwords do not match.');
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9\s]/.test(newPassword)
    ) {
      setAuthError('Use at least eight characters with uppercase, lowercase, a number, and a special character.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/reset-password`, {
        resetToken,
        newPassword,
      });
      setRecoveryNotice(response.data.message);
      setAuthStage('success');
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Could not reset the password. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const returnToAdminLogin = () => {
    setAuthStage('login');
    setAuthError('');
    setRecoveryNotice('');
    setResetEmail('');
    setResetCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
      setAdmin(null);
      setDashboardStats(null);
      setFormNotice('');
      setAuthError('');
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Could not sign out. Please try again.');
    }
  };

  const handleImageUpload = async (event, category, setForm) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormError('');
    setFormNotice('');
    setUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append('image', file);
      const response = await axios.post(`${API_BASE}/uploads/image?category=${category}`, payload);
      setForm((current) => ({
        ...current,
        image: response.data.image,
        imagePublicId: response.data.imagePublicId,
      }));
      setFormNotice('Image uploaded successfully.');
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not upload this image.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleNewsCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormNotice('');
    try {
      const payload = { ...newsForm, publishedDate: newsForm.status === 'published' ? new Date().toISOString() : null };
      if (editing.news) await axios.put(`${API_BASE}/news/${editing.news}`, payload);
      else await axios.post(`${API_BASE}/news`, payload);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not save this article.');
      return;
    }
    setNewsForm({
      title: '',
      subtitle: '',
      content: '',
      category: 'Academics',
      author: 'School Editorial Team',
      image: '',
      imagePublicId: '',
      featured: false,
      status: 'draft',
    });
    setEditing({ ...editing, news: null });
    setFormNotice('Article saved successfully.');
    loadDashboard(admin);
  };

  const handleEventCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormNotice('');
    try {
      if (editing.event) await axios.put(`${API_BASE}/events/${editing.event}`, eventForm);
      else await axios.post(`${API_BASE}/events`, eventForm);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not create this event.');
      return;
    }
    setEventForm({ title: '', description: '', date: '', time: '', location: '', image: '', imagePublicId: '', registrationLink: '', featured: false });
    setEditing({ ...editing, event: null });
    setFormNotice('Event created successfully.');
    loadDashboard(admin);
  };

  const handleAnnouncementCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormNotice('');
    try {
      if (editing.announcement) await axios.put(`${API_BASE}/announcements/${editing.announcement}`, announcementForm);
      else await axios.post(`${API_BASE}/announcements`, announcementForm);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not publish this announcement.');
      return;
    }
    setAnnouncementForm({ title: '', message: '', featured: false });
    setEditing({ ...editing, announcement: null });
    setFormNotice('Announcement published successfully.');
    loadDashboard(admin);
  };

  const handleClubSave = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormNotice('');
    try {
      if (editing.club) await axios.put(`${API_BASE}/clubs/${editing.club}`, clubForm);
      else await axios.post(`${API_BASE}/clubs`, clubForm);
      setClubForm({ name: '', description: '', category: 'School Life', image: '', imagePublicId: '' });
      setEditing({ ...editing, club: null });
      setFormNotice('Club saved successfully.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not save this club.');
    }
  };

  const deleteContent = async (type, item) => {
    if (!window.confirm(`Delete "${item.title || item.name}"? This cannot be undone.`)) return;
    setFormError('');
    try {
      await axios.delete(`${API_BASE}/${type}/${item._id}`);
      setFormNotice('Content deleted.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not delete this content.');
    }
  };

  const handleAdminCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      await axios.post(`${API_BASE}/admin`, newAdmin);
      setNewAdmin({ name: '', username: '', email: '', department: '', role: 'admin', permissions: [] });
      setFormNotice('Administrator created successfully. Welcome email sent.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not create this administrator.');
    }
  };

  const handleDepartmentCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      await axios.post(`${API_BASE}/departments`, { name: departmentName });
      setDepartmentName('');
      setFormNotice('Department created successfully.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not create this department.');
    }
  };

  const updateAdministrator = async (target, updates) => {
    setFormError('');
    try {
      await axios.patch(`${API_BASE}/admin/${target.id}`, updates);
      setFormNotice('Administrator updated successfully.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not update this administrator.');
    }
  };

  const deleteAdministrator = async (target) => {
    if (!window.confirm(`Delete administrator "${target.name}"? This cannot be undone.`)) return;
    setFormError('');
    try {
      await axios.delete(`${API_BASE}/admin/${target.id}`);
      setFormNotice('Administrator deleted.');
      loadDashboard(admin);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not delete this administrator.');
    }
  };

  const canManage = (permission) => canManageFor(admin, permission);
  const scrollToEditor = (formRef) => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      formRef.current?.querySelector('input:not([type="checkbox"]), textarea')?.focus({ preventScroll: true });
    });
  };
  const editNews = (item) => {
    setEditing({ ...editing, news: item._id });
    setNewsForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      content: item.content || '',
      category: item.category || 'Academics',
      author: item.author || admin.name,
      image: item.image || '',
      imagePublicId: item.imagePublicId || '',
      featured: Boolean(item.featured),
      status: item.status || 'draft',
    });
    scrollToEditor(newsFormRef);
  };
  const editEvent = (item) => {
    setEditing({ ...editing, event: item._id });
    setEventForm({
      title: item.title || '',
      description: item.description || '',
      date: item.date?.slice(0, 10) || '',
      time: item.time || '',
      location: item.location || '',
      image: item.image || '',
      imagePublicId: item.imagePublicId || '',
      registrationLink: item.registrationLink || '',
      featured: Boolean(item.featured),
    });
    scrollToEditor(eventFormRef);
  };
  const editClub = (item) => {
    setEditing({ ...editing, club: item._id });
    setClubForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'School Life',
      image: item.image || '',
      imagePublicId: item.imagePublicId || '',
    });
    scrollToEditor(clubFormRef);
  };
  const editAnnouncement = (item) => {
    setEditing({ ...editing, announcement: item._id });
    setAnnouncementForm({ title: item.title || '', message: item.message || '', featured: Boolean(item.featured) });
    scrollToEditor(announcementFormRef);
  };

  if (checkingSession) {
    return <main className="page-shell container admin-page"><div className="empty-state" role="status">Checking administrator session…</div></main>;
  }

  if (!admin) {
    return (
      <main className="page-shell container admin-page login-page">
        <div className="login-card">
          <span className="eyebrow muted"><ShieldCheck size={16} /> THE JUNIOR TALENT administration</span>
          {authStage === 'login' && <>
            <h1>Administrator sign in</h1>
            <p>Use your administrator email or username to access the dashboard.</p>
          </>}
          {authStage === 'forgot' && <>
            <h1>Forgot your password?</h1>
            <p>Enter the email address registered to your administrator account. We’ll send a verification code if it matches an active account.</p>
          </>}
          {authStage === 'verify' && <>
            <h1>Check your email</h1>
            <p>Enter the six-digit verification code sent to <strong>{resetEmail}</strong>. The code expires in 10 minutes.</p>
          </>}
          {authStage === 'reset' && <>
            <h1>Create a new password</h1>
            <p>Choose a strong password for your administrator account.</p>
          </>}
          {authStage === 'success' && <>
            <CheckCircle2 className="recovery-success-icon" size={44} aria-hidden="true" />
            <h1>Password reset complete</h1>
            <p>{recoveryNotice || 'Your password has been updated. Sign in with your new password.'}</p>
            <button type="button" className="primary-btn recovery-submit" onClick={returnToAdminLogin}>Return to sign in</button>
          </>}
          {authError && <p className="form-message error" role="alert">{authError}</p>}
          {recoveryNotice && authStage !== 'success' && <p className="form-message success" role="status">{recoveryNotice}</p>}
          {authStage === 'login' && <>
            <form onSubmit={handleLogin} className="stack-form">
              <label htmlFor="admin-identifier">Email or username</label>
              <input id="admin-identifier" autoComplete="username" value={loginDetails.identifier} onChange={(event) => setLoginDetails({ ...loginDetails, identifier: event.target.value })} required />
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" autoComplete="current-password" value={loginDetails.password} onChange={(event) => setLoginDetails({ ...loginDetails, password: event.target.value })} required />
              <button type="submit" className="primary-btn">Sign in</button>
            </form>
            <button type="button" className="forgot-password-link" onClick={() => { setAuthError(''); setRecoveryNotice(''); setAuthStage('forgot'); }}>Forgot password?</button>
          </>}
          {authStage === 'forgot' && <form onSubmit={handleForgotPassword} className="stack-form recovery-form">
            <label htmlFor="recovery-email">Registered email address</label>
            <input id="recovery-email" type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required />
            <button type="submit" className="primary-btn" disabled={recoveryLoading}>{recoveryLoading ? 'Sending…' : 'Send verification code'}</button>
            <button type="button" className="recovery-back" onClick={returnToAdminLogin}><ArrowLeft size={16} /> Back to sign in</button>
          </form>}
          {authStage === 'verify' && <form onSubmit={handleVerifyResetCode} className="stack-form recovery-form">
            <label htmlFor="recovery-code">Six-digit verification code</label>
            <input id="recovery-code" className="recovery-code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
            <button type="submit" className="primary-btn" disabled={recoveryLoading}>{recoveryLoading ? 'Verifying…' : 'Verify code'}</button>
            <p className="resend-caption">{resendCountdown > 0 ? `You can request another code in ${resendCountdown}s.` : 'Didn’t receive the code?'}</p>
            <button type="button" className="recovery-back" onClick={handleResendResetCode} disabled={recoveryLoading || resendCountdown > 0}>
              Resend code{resendCountdown > 0 ? ` (${resendCountdown}s)` : ''}
            </button>
            <button type="button" className="recovery-back" onClick={() => { setAuthError(''); setAuthStage('forgot'); }}><ArrowLeft size={16} /> Change email address</button>
          </form>}
          {authStage === 'reset' && <form onSubmit={handleResetPassword} className="stack-form recovery-form">
            <label htmlFor="new-password">New password</label>
            <div className="password-input-wrap">
              <input id="new-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              <button type="button" className="password-visibility" aria-label={showNewPassword ? 'Hide password' : 'Show password'} onClick={() => setShowNewPassword((visible) => !visible)}>
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required />
            <ul className="password-guidance">
              <li>At least 8 characters</li>
              <li>Uppercase and lowercase letters</li>
              <li>At least one number and special character</li>
            </ul>
            <button type="submit" className="primary-btn" disabled={recoveryLoading}>{recoveryLoading ? 'Updating password…' : 'Reset password'}</button>
          </form>}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell container admin-page">
      <div className="page-intro">
        <span className="eyebrow muted"><ShieldCheck size={16} /> Dashboard</span>
        <h1>Welcome, {admin.name}</h1>
        <button type="button" className="secondary-btn admin-logout" onClick={handleLogout}>Log out</button>
      </div>

      {formError && <p className="form-message error" role="alert">{formError}</p>}
      {formNotice && <p className="form-message success" role="status">{formNotice}</p>}

      <div className="stats-grid">
        <div className="stat-card"><span>Total published news</span><strong>{stats.publishedNews}</strong></div>
        <div className="stat-card"><span>Total draft articles</span><strong>{stats.draftArticles}</strong></div>
        <div className="stat-card"><span>Upcoming events</span><strong>{stats.upcomingEvents}</strong></div>
        <div className="stat-card"><span>Published announcements</span><strong>{stats.publishedAnnouncements}</strong></div>
        <div className="stat-card"><span>Administrators</span><strong>{stats.totalAdmins}</strong></div>
        <div className="stat-card"><span>Active clubs</span><strong>{stats.totalClubs}</strong></div>
      </div>

      <section className="admin-section">
        {canManage('news:write') && <div className="admin-panel" ref={newsFormRef}>
          <h3>Create news</h3>
          <form onSubmit={handleNewsCreate} className="stack-form">
            <input value={newsForm.title} onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })} placeholder="Article title" required />
            <input value={newsForm.subtitle} onChange={(event) => setNewsForm({ ...newsForm, subtitle: event.target.value })} placeholder="Article subtitle" />
            <textarea rows="5" value={newsForm.content} onChange={(event) => setNewsForm({ ...newsForm, content: event.target.value })} placeholder="Main article content" required />
            <label className="image-upload-field">
              <span>Featured image <small>JPEG, PNG, GIF or WebP · up to 5 MB</small></span>
              <span className="image-upload-trigger">{uploadingImage ? 'Uploading image…' : 'Choose image'}</span>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => handleImageUpload(event, 'news', setNewsForm)} disabled={uploadingImage} />
            </label>
            {newsForm.image && <LoadingImage className="image-upload-preview" wrapperClassName="image-upload-preview-shell" src={newsForm.image} alt="Selected article" />}
            <div className="inline-fields">
              <input value={newsForm.author} onChange={(event) => setNewsForm({ ...newsForm, author: event.target.value })} placeholder="Author" />
              <select value={newsForm.category} onChange={(event) => setNewsForm({ ...newsForm, category: event.target.value })}>
                <option>Academics</option>
                <option>Achievements</option>
                <option>Campus Life</option>
                <option>Student Voice</option>
              </select>
            </div>
            <div className="inline-fields">
              <label><input type="checkbox" checked={newsForm.featured} onChange={() => setNewsForm({ ...newsForm, featured: !newsForm.featured })} /> Featured</label>
              <select value={newsForm.status} onChange={(event) => setNewsForm({ ...newsForm, status: event.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <button type="submit" className="primary-btn" disabled={uploadingImage}>{editing.news ? 'Update article' : `Save as ${newsForm.status}`}</button>
          </form>
        </div>}

        {canManage('events:write') && <div className="admin-panel" ref={eventFormRef}>
          <h3>Create event</h3>
          <form onSubmit={handleEventCreate} className="stack-form">
            <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} placeholder="Event title" required />
            <textarea rows="4" value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} placeholder="Event description" required />
            <div className="inline-fields">
              <input type="date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} required />
              <input value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} placeholder="Time" />
            </div>
            <input value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} placeholder="Location" required />
            <label className="image-upload-field">
              <span>Event image <small>JPEG, PNG, GIF or WebP · up to 5 MB</small></span>
              <span className="image-upload-trigger">{uploadingImage ? 'Uploading image…' : 'Choose image'}</span>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => handleImageUpload(event, 'events', setEventForm)} disabled={uploadingImage} />
            </label>
            {eventForm.image && <LoadingImage className="image-upload-preview" wrapperClassName="image-upload-preview-shell" src={eventForm.image} alt="Selected event" />}
            <input value={eventForm.registrationLink} onChange={(event) => setEventForm({ ...eventForm, registrationLink: event.target.value })} placeholder="Registration link" />
            <label><input type="checkbox" checked={eventForm.featured} onChange={() => setEventForm({ ...eventForm, featured: !eventForm.featured })} /> Featured</label>
            <button type="submit" className="primary-btn" disabled={uploadingImage}>{editing.event ? 'Update event' : 'Create event'}</button>
          </form>
        </div>}

        {canManage('clubs:write') && <div className="admin-panel" ref={clubFormRef}>
          <h3>{editing.club ? 'Edit club' : 'Create club'}</h3>
          <form onSubmit={handleClubSave} className="stack-form">
            <input value={clubForm.name} onChange={(event) => setClubForm({ ...clubForm, name: event.target.value })} placeholder="Club name" required />
            <textarea rows="4" value={clubForm.description} onChange={(event) => setClubForm({ ...clubForm, description: event.target.value })} placeholder="Club description" required />
            <input value={clubForm.category} onChange={(event) => setClubForm({ ...clubForm, category: event.target.value })} placeholder="Category" />
            <label className="image-upload-field">
              <span>Club image <small>JPEG, PNG, GIF or WebP · up to 5 MB</small></span>
              <span className="image-upload-trigger">{uploadingImage ? 'Uploading image…' : 'Choose image'}</span>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => handleImageUpload(event, 'clubs', setClubForm)} disabled={uploadingImage} />
            </label>
            {clubForm.image && <LoadingImage className="image-upload-preview" wrapperClassName="image-upload-preview-shell" src={clubForm.image} alt="Selected club" />}
            <button type="submit" className="primary-btn" disabled={uploadingImage}>{editing.club ? 'Update club' : 'Create club'}</button>
          </form>
        </div>}

        {canManage('announcements:write') && <div className="admin-panel" ref={announcementFormRef}>
          <h3>Create announcement</h3>
          <form onSubmit={handleAnnouncementCreate} className="stack-form">
            <input value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} placeholder="Announcement title" required />
            <textarea rows="4" value={announcementForm.message} onChange={(event) => setAnnouncementForm({ ...announcementForm, message: event.target.value })} placeholder="Message" required />
            <label><input type="checkbox" checked={announcementForm.featured} onChange={() => setAnnouncementForm({ ...announcementForm, featured: !announcementForm.featured })} /> Featured</label>
            <button type="submit" className="primary-btn">{editing.announcement ? 'Update announcement' : 'Publish announcement'}</button>
          </form>
        </div>}
      </section>

      <section className="admin-section content-management">
        {canManage('news:write') && <div className="admin-panel">
          <h3>Manage news</h3>
          <ul className="activity-list">
            {news.map((item) => <li key={item._id}><span>{item.title}<small>{item.status}</small></span><div className="management-actions"><button type="button" onClick={() => editNews(item)}>Edit</button>{canManage('news:delete') && <button type="button" onClick={() => deleteContent('news', item)}>Delete</button>}</div></li>)}
            {news.length === 0 && <li>No news articles yet.</li>}
          </ul>
        </div>}
        {canManage('events:write') && <div className="admin-panel">
          <h3>Manage events</h3>
          <ul className="activity-list">
            {events.map((item) => <li key={item._id}><span>{item.title}<small>{item.date}</small></span><div className="management-actions"><button type="button" onClick={() => editEvent(item)}>Edit</button>{canManage('events:delete') && <button type="button" onClick={() => deleteContent('events', item)}>Delete</button>}</div></li>)}
            {events.length === 0 && <li>No events yet.</li>}
          </ul>
        </div>}
        {canManage('clubs:write') && <div className="admin-panel">
          <h3>Manage clubs</h3>
          <ul className="activity-list">
            {clubs.map((item) => <li key={item._id}><span>{item.name}<small>{item.category}</small></span><div className="management-actions"><button type="button" onClick={() => editClub(item)}>Edit</button>{canManage('clubs:delete') && <button type="button" onClick={() => deleteContent('clubs', item)}>Delete</button>}</div></li>)}
            {clubs.length === 0 && <li>No clubs yet.</li>}
          </ul>
        </div>}
        {canManage('announcements:write') && <div className="admin-panel">
          <h3>Manage announcements</h3>
          <ul className="activity-list">
            {announcements.map((item) => <li key={item._id}><span>{item.title}<small>{formatDate(item.date)}</small></span><div className="management-actions"><button type="button" onClick={() => editAnnouncement(item)}>Edit</button>{canManage('announcements:delete') && <button type="button" onClick={() => deleteContent('announcements', item)}>Delete</button>}</div></li>)}
            {announcements.length === 0 && <li>No announcements yet.</li>}
          </ul>
        </div>}
      </section>

      {admin.role === 'super_admin' && <section className="admin-section admin-management">
        <div className="admin-panel">
          <h3>Manage administrators</h3>
          <form onSubmit={handleAdminCreate} className="stack-form">
            <input value={newAdmin.name} onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })} placeholder="Full name" required />
            <div className="inline-fields">
              <input value={newAdmin.username} onChange={(event) => setNewAdmin({ ...newAdmin, username: event.target.value })} placeholder="Username" required />
              <input type="email" value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })} placeholder="Email" required />
            </div>
            <div className="inline-fields">
              <select value={newAdmin.role} onChange={(event) => setNewAdmin({ ...newAdmin, role: event.target.value })}>
                <option value="admin">Administrator</option>
                <option value="department_admin">Department admin</option>
              </select>
              <select value={newAdmin.department} onChange={(event) => setNewAdmin({ ...newAdmin, department: event.target.value })} required={newAdmin.role === 'department_admin'}>
                <option value="">Select department</option>
                {departments.filter((department) => department.status === 'active').map((department) => <option value={department._id} key={department._id}>{department.name}</option>)}
              </select>
            </div>
            <fieldset className="permission-options">
              <legend>Permissions</legend>
              {['news:write', 'news:delete', 'events:write', 'events:delete', 'clubs:write', 'clubs:delete', 'announcements:write', 'announcements:delete'].map((permission) => (
                <label key={permission}><input type="checkbox" checked={newAdmin.permissions.includes(permission)} onChange={(event) => setNewAdmin({ ...newAdmin, permissions: event.target.checked ? [...newAdmin.permissions, permission] : newAdmin.permissions.filter((value) => value !== permission) })} />{permission}</label>
              ))}
            </fieldset>
            <button type="submit" className="primary-btn">Create administrator</button>
          </form>
          <ul className="activity-list">
            {administrators.map((item) => <li key={item.id}><span>{item.name}<small>{item.username} · {item.role} · {item.status || 'active'}</small></span>{item.id !== admin.id && item.role !== 'super_admin' && <div className="management-actions"><button type="button" onClick={() => updateAdministrator(item, { status: item.status === 'suspended' ? 'active' : 'suspended' })}>{item.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button><button type="button" onClick={() => deleteAdministrator(item)}>Delete</button></div>}</li>)}
          </ul>
        </div>
        <div className="admin-panel">
          <h3>Departments</h3>
          <form onSubmit={handleDepartmentCreate} className="stack-form">
            <input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="New department name" required />
            <button type="submit" className="primary-btn">Add department</button>
          </form>
          <ul className="activity-list">
            {departments.map((department) => <li key={department._id}><span>{department.name}<small>{department.status}</small></span></li>)}
          </ul>
        </div>
      </section>}

      <section className="admin-section lower-panel">
        <div className="admin-panel">
          <h3>Recent publishing activity</h3>
          <ul className="activity-list">
            {stats.activities.map((item) => (
              <li key={item._id}>
                <strong>{item.admin?.name || 'Administrator'}</strong>
                <span>{item.action}</span>
              </li>
            ))}
            {stats.activities.length === 0 && <li>No recent activity recorded.</li>}
          </ul>
        </div>
        <div className="admin-panel">
          <h3>News overview</h3>
          <ul className="activity-list compact-list">
            {news.slice(0, 5).map((item) => (
              <li key={item._id}>
                <span>{item.title}</span>
                <strong>{item.status}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
