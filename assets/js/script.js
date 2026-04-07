// Smooth scrolling for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Game initialization functionality
document.querySelectorAll('.hero-cta-btn, .btn-primary').forEach(btn => {
  if(btn.textContent.trim() === 'Play Now') {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      if (card) {
        const gameTitle = card.querySelector('.game-title')?.textContent;
        console.log('Starting game:', gameTitle);
      }
    });
  }
});

// Hamburger menu
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('active');
  hamburger.classList.toggle('active');
});

// Close mobile menu when clicking a link
mobileMenu.querySelectorAll('a, button').forEach(item => {
  item.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    hamburger.classList.remove('active');
  });
});

// Add some animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.section, .area-card, .feature-card, .t-card, .pricing-card, .research-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s, transform 0.6s';
  observer.observe(el);
});



// LOADING STATES & PROGRESSIVE ENHANCEMENT
class PageLoader {
  constructor() {
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.skeletons = {
      hero: document.getElementById('hero-skeleton'),
      stats: document.getElementById('stats-skeleton'),
      areas: document.getElementById('areas-skeleton'),
      features: document.getElementById('features-skeleton'),
      testimonials: document.getElementById('testimonials-skeleton'),
      pricing: document.getElementById('pricing-skeleton')
    };
    this.sections = {
      hero: document.querySelector('.hero'),
      stats: document.querySelector('.stats'),
      areas: document.querySelector('.section:has(.areas-grid)'),
      features: document.querySelector('.section:has(.features-grid)'),
      testimonials: document.querySelector('.testimonials'),
      pricing: document.querySelector('.section:has(.pricing-grid)')
    };
    this.init();
  }

  init() {
    // Start loading sequence
    this.startLoading();

    // Simulate loading time (in real app, this would be actual resource loading)
    setTimeout(() => {
      this.finishLoading();
    }, 2000);
  }

  startLoading() {
    // Show loading overlay
    this.loadingOverlay.classList.remove('hidden');
  }

  finishLoading() {
    // Hide loading overlay with animation
    this.loadingOverlay.classList.add('hidden');

    // Start progressive content reveal
    this.revealContent();
  }

  revealContent() {
    const sections = Object.values(this.sections);
    const skeletons = Object.values(this.skeletons);

    // Reveal sections with staggered timing
    sections.forEach((section, index) => {
      if (section) {
        setTimeout(() => {
          // Hide skeleton
          if (skeletons[index]) {
            skeletons[index].style.display = 'none';
          }

          // Show actual content with animation
          section.classList.add('content-reveal');
          section.classList.add('revealed');
          section.classList.add(`stagger-${(index % 6) + 1}`);
        }, index * 200);
      }
    });
  }
}

// LAZY LOADING WITH INTERSECTION OBSERVER
class LazyLoader {
  constructor() {
    this.observerOptions = {
      threshold: 0.1,
      rootMargin: '50px 0px'
    };
    this.init();
  }

  init() {
    // Observe all lazy-load elements
    const lazyElements = document.querySelectorAll('.lazy-load');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('loaded');
          observer.unobserve(entry.target);
        }
      });
    }, this.observerOptions);

    lazyElements.forEach(element => {
      observer.observe(element);
    });
  }
}

// PROGRESSIVE IMAGE LOADING
class ProgressiveImageLoader {
  constructor() {
    this.init();
  }

  init() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
}

// ERROR HANDLING
class ErrorHandler {
  constructor() {
    this.init();
  }

  init() {
    // Global error handler for images
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        this.handleImageError(e.target);
      }
    }, true);

    // Handle network errors
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  handleImageError(img) {
    // Create error state for failed images
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-state';
    errorContainer.innerHTML = `
      <div class="error-icon">⚠️</div>
      <div class="error-title">Image Failed to Load</div>
      <div class="error-message">Unable to load image. Please check your connection.</div>
      <button class="retry-btn" onclick="location.reload()">Retry</button>
    `;

    img.parentNode.replaceChild(errorContainer, img);
  }

  handleOnline() {
    // Remove offline indicators if any
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) {
      offlineBanner.remove();
    }
  }

  handleOffline() {
    // Show offline indicator
    this.showOfflineMessage();
  }

  showOfflineMessage() {
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      text-align: center;
      padding: 10px;
      z-index: 10000;
      font-family: 'Nunito', sans-serif;
    `;
    offlineBanner.textContent = 'You are currently offline. Some features may not work.';

    document.body.insertBefore(offlineBanner, document.body.firstChild);
  }
}

// Initialize all loading systems
document.addEventListener('DOMContentLoaded', () => {
  new PageLoader();
  new LazyLoader();
  new ProgressiveImageLoader();
  new ErrorHandler();
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

