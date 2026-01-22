// Loudio.vn - Main JavaScript (Performance Optimized)

// Performance Utilities
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const rafThrottle = (func) => {
    let rafId = null;
    return (...args) => {
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                func(...args);
                rafId = null;
            });
        }
    };
};

document.addEventListener('DOMContentLoaded', () => {
    // Cache all DOM references upfront
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    const navbar = document.querySelector('.navbar');
    const billingToggle = document.getElementById('billing-toggle');
    const prices = document.querySelectorAll('.pricing-card .price');
    const modal = document.getElementById('onboarding-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalForm = document.getElementById('onboarding-form');
    const blogGrid = document.getElementById('blog-grid');
    const bgMusic = document.getElementById('bg-music');
    const musicToggle = document.getElementById('musicToggle');
    const musicText = musicToggle?.querySelector('.music-text');
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    const mainSignupForm = document.querySelector('.signup-form');

    // Mobile Menu Toggle
    const closeMenu = () => {
        navLinks?.classList.remove('active');
        navActions?.classList.remove('active');
        mobileBtn?.classList.remove('open');
    };

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navActions.classList.toggle('active');
            mobileBtn.classList.toggle('open');
        });
    }

    // Close menu when clicking a link (event delegation would be overkill here)
    if (navLinks && navActions) {
        document.querySelectorAll('.nav-links a, .nav-actions a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) closeMenu();
            });
        });
    }

    // Pricing Toggle
    if (billingToggle && prices.length > 0) {
        billingToggle.addEventListener('change', () => {
            const isYearly = billingToggle.checked;

            prices.forEach(price => {
                const monthlyVal = price.dataset.monthly;
                const yearlyVal = price.dataset.yearly;
                const yearlyOriginal = price.dataset.yearlyOriginal;

                price.style.opacity = '0';

                setTimeout(() => {
                    if (isYearly && yearlyOriginal) {
                        price.innerHTML = `<span class="original-price">${yearlyOriginal}</span> <span class="current-price">${yearlyVal}</span>`;
                    } else {
                        price.textContent = isYearly ? yearlyVal : monthlyVal;
                    }
                    price.style.opacity = '1';
                }, 200);
            });
        });
    }

    // Optimized Scroll Logic with RAF
    if (navbar) {
        const handleScroll = rafThrottle(() => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Onboarding Modal Logic
    // (modal, closeModalBtn, modalForm already cached at top)

    // Check if user has already seen the popup (Bumped key to v2 to force show for recent updates)
    const popupSeen = localStorage.getItem('loudio_popup_seen_v2');

    if (modal && !popupSeen) {
        const showModal = () => {
            modal.style.display = 'flex';
            // Slight delay to allow display flex to apply before adding class for opacity transition
            setTimeout(() => {
                modal.classList.add('show');
                localStorage.setItem('loudio_popup_seen_v2', 'true');
            }, 10);
        };

        // Trigger 1: Time-based (8 seconds)
        const timerCallback = setTimeout(showModal, 8000);

        // Trigger 2: Scroll-based (30% of page)
        const scrollCallback = () => {
            const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercentage > 30) {
                showModal();
                // Clear timer if scroll triggers first
                clearTimeout(timerCallback);
                // Remove listener
                window.removeEventListener('scroll', scrollCallback);
            }
        };
        window.addEventListener('scroll', scrollCallback);

        // Close Logic
        const hideModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 400); // Match transition duration
        };

        closeModalBtn.addEventListener('click', hideModal);

        // Close on click outside
        window.addEventListener('click', (e) => {
            if (e.target == modal) {
                hideModal();
            }
        });

        // Form Submit
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('submit-btn');
            const originalBtnText = submitBtn.textContent;

            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const name = document.getElementById('popup-name').value;
            const contact = document.getElementById('popup-contact').value;

            const result = await submitLead({
                venue_name: name,
                contact_info: contact,
                email: contact.includes('@') ? contact : undefined,
                source: 'Onboarding Popup'
            });

            if (result.success) {
                // On Success - PREMIUM REDESIGN
                const modalBody = document.querySelector('.modal-content');
                modalBody.innerHTML = `
                    <div class="premium-success-card">
                        <div class="success-glow"></div>
                        <div class="success-drawing-container">
                            <svg viewBox="0 0 52 52" class="checkmark-svg">
                                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h2 class="success-title">The Future Awaits</h2>
                        <p class="success-text">Your venue is one step closer to an AI-powered atmosphere. We'll reach out to <strong>${contact}</strong> within 24 hours.</p>
                        <button class="btn btn-primary" onclick="window.location.reload()" style="min-width: 200px;">Return to Site</button>
                    </div>
                `;
            } else {
                alert('Something went wrong. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Main Signup Form Logic
    // (mainSignupForm already cached at top)
    if (mainSignupForm) {
        mainSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = mainSignupForm.querySelector('button[type="submit"]');

            // Collect form data BEFORE changing UI
            const name = mainSignupForm.querySelector('[data-i18n="cta_name_ph"]').value;
            const venue = mainSignupForm.querySelector('[data-i18n="cta_venue_ph"]').value;
            const phone = mainSignupForm.querySelector('[data-i18n="cta_phone_ph"]').value;
            const email = mainSignupForm.querySelector('[data-i18n="cta_email_ph"]').value;
            const notes = mainSignupForm.querySelector('[data-i18n="cta_notes_ph"]').value;

            // OPTIMISTIC UI: Show success immediately
            mainSignupForm.style.background = 'transparent';
            mainSignupForm.style.border = 'none';
            mainSignupForm.style.boxShadow = 'none';

            mainSignupForm.innerHTML = `
                <div class="premium-success-card">
                    <div class="success-glow"></div>
                    <div class="success-drawing-container">
                        <svg viewBox="0 0 52 52" class="checkmark-svg">
                            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                    <h2 class="success-title" data-i18n="success_title">Welcome to the Club</h2>
                    <p class="success-text" data-i18n="success_desc">We've received your request. Our team is already analyzing your venue's potential. Talk soon!</p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <a href="#hero" class="btn btn-outline">Back to Top</a>
                        <a href="https://loudiomanager.com" class="btn btn-glass">Explore Dashboard</a>
                    </div>
                </div>
            `;

            // BACKGROUND: Send lead data (fire and forget)
            submitLead({
                name: name,
                venue_name: venue,
                contact_info: `Phone: ${phone}, Email: ${email}`,
                email: email,
                notes: notes,
                source: 'Main Section'
            }).catch(err => console.error('Lead submission failed:', err));
        });
    }

    // Centralized Lead Submission
    async function submitLead(data) {
        // Using Google Apps Script for reliability and easy email auto-reply
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwc5GX6-nL3OHBhR5hk7nm3y0UsM2vjqxECSwKRdgkm_YqWjaSxFhaJ5acw-5w2AidH/exec';

        try {
            // 1. Fetch IP Address
            let userIP = 'Unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                userIP = ipData.ip;
            } catch (e) {
                console.warn('Could not fetch IP address', e);
            }

            // 2. Prepare Payload
            const payload = {
                ...data,
                ip: userIP,
                timestamp: new Date().toISOString()
            };

            // 3. Submit to GAS
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // GAS requires no-cors
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('Lead successfully submitted via Google Script');
            return { success: true };

        } catch (error) {
            console.error('Lead submission failed', error);
            return { success: false };
        }
    }

    // Blog Loading Logic
    // (blogGrid already cached at top)
    if (blogGrid) {
        loadBlogArticles();
    }

    async function loadBlogArticles() {
        const SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE'; // User needs to update this

        if (SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
            // Show dummy articles if URL is not set
            const lang = document.documentElement.lang || 'en';
            let articles = [];

            if (lang === 'vi') {
                articles = [
                    {
                        title: "Tương Lai Âm Nhạc: AI DJ Tốt Hơn Anh DJ Steve",
                        excerpt: "Tại sao playlist Spotify 'Vibe 2024' có thể đang phá hỏng không khí quán bạn.",
                        image: "https://images.unsplash.com/photo-1514525253361-bee8718a74a1?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy1_vi"
                    },
                    {
                        title: "Tăng Doanh Thu: Kiếm Tiền Từ Gu Nhạc 'Độc Lạ' Của Khách",
                        excerpt: "Biến môi trường âm nhạc thành công cụ kiếm tiền (hợp pháp!).",
                        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy2_vi"
                    },
                    {
                        title: "Tạo 'Vibe': Tránh Mosh Pit Tại Tiệm Bánh Chay",
                        excerpt: "Chuyên gia chia sẻ cách cân bằng yêu cầu nhạc mà không để Slayer phá hỏng bữa tối lãng mạn.",
                        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy3_vi"
                    }
                ];
            } else {
                articles = [
                    {
                        title: "The Future of Venue Soundscapes: Your DJ is a Bot (And He's Nicer Than Steve)",
                        excerpt: "Why relying on a Spotify playlist titled 'Vibe 2024' is a dangerous game for your business.",
                        image: "https://images.unsplash.com/photo-1514525253361-bee8718a74a1?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy1"
                    },
                    {
                        title: "Boosting ROI: How to Get Paid When Your Customers Have Bad Taste",
                        excerpt: "Turn your musical environment into a revenue engine (and a legalized bribe system).",
                        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy2"
                    },
                    {
                        title: "Vibe-Setting 101: Preventing Musical Mosh Pits at Vegan Bakeries",
                        excerpt: "Expert advice on balancing guest requests without letting Slayer ruin a romantic dinner.",
                        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=800&q=80",
                        date: new Date().toISOString(),
                        id: "dummy3"
                    }
                ];
            }

            renderBlogArticles(articles);
            return;
        }

        try {
            const response = await fetch(`${SCRIPT_URL}?action=get_articles`);
            const articles = await response.json();
            renderBlogArticles(articles);
        } catch (error) {
            console.error('Failed to load blog articles', error);
            blogGrid.innerHTML = '<p style="text-align: center; color: var(--text-dim);">Unable to load articles at this time.</p>';
        }
    }

    function renderBlogArticles(articles) {
        if (!blogGrid) return;

        if (articles.length === 0) {
            blogGrid.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No articles published yet. Check back soon!</p>';
            return;
        }

        blogGrid.innerHTML = articles.map(art => {
            const articleUrl = `article.html?id=${art.id}`;
            console.log(`Rendering article: ${art.title} -> ${articleUrl}`);
            return `
                <article class="article-card">
                    <img src="${art.image || 'https://images.unsplash.com/photo-1459749411177-042180ce6742?auto=format&fit=crop&w=800&q=80'}" alt="${art.title}" class="article-image">
                    <div class="article-content">
                        <span class="article-tag">Insights</span>
                        <h3 class="article-title">${art.title}</h3>
                        <p class="article-excerpt">${art.excerpt}</p>
                        <div class="article-footer">
                            <span class="article-date">${new Date(art.date).toLocaleDateString()}</span>
                            <a href="${articleUrl}" class="read-more"><span data-i18n="read_more">Read More →</span></a>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Update i18n for newly rendered content
        if (typeof translations !== 'undefined') {
            const lang = document.documentElement.lang || 'en';
            const dict = translations[lang];
            blogGrid.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) el.innerHTML = dict[key];
            });
        }
    }

    // Language Switcher Logic
    // (langBtn, langDropdown, langOptions already cached at top)

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            if (langDropdown.classList.contains('show')) {
                langDropdown.classList.remove('show');
            }
        });

        // Handle language selection
        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = option.getAttribute('data-lang');
                const flagImg = option.querySelector('.flag-img');

                // Update Button with flag image and abbreviated name
                const btnFlagImg = langBtn.querySelector('.flag-img');
                if (flagImg && btnFlagImg) {
                    btnFlagImg.src = flagImg.src;
                    btnFlagImg.alt = flagImg.alt;
                }

                const abbrev = { en: 'EN', vi: 'VI', fr: 'FR' };
                langBtn.querySelector('.lang-name').textContent = abbrev[lang] || lang.toUpperCase();

                // Update Active State
                langOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                // Close Dropdown
                langDropdown.classList.remove('show');

                console.log(`Language changed to: ${lang}`);

                // Load translations
                if (typeof translations !== 'undefined' && translations[lang]) {
                    const dict = translations[lang];
                    document.querySelectorAll('[data-i18n]').forEach(el => {
                        const key = el.getAttribute('data-i18n');
                        if (dict[key]) {
                            // If it's an input or textarea, update placeholder
                            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                                el.placeholder = dict[key];
                            } else {
                                el.innerHTML = dict[key];
                            }
                        }
                    });

                    // Update HTML lang attribute
                    document.documentElement.lang = lang;
                }
            });
        });
    }

    // Background Music Logic
    // (bgMusic, musicToggle, musicText already cached at top)
    let isMusicPlaying = false;

    if (bgMusic && musicToggle) {
        bgMusic.volume = 0.4; // Set initial volume

        const toggleMusic = () => {
            if (isMusicPlaying) {
                bgMusic.pause();
                musicToggle.classList.remove('playing');
                musicText.textContent = 'Music Off';
            } else {
                bgMusic.play().catch(e => console.log("Autoplay blocked, waiting for interaction."));
                musicToggle.classList.add('playing');
                musicText.textContent = 'Music On';
            }
            isMusicPlaying = !isMusicPlaying;
        };

        musicToggle.addEventListener('click', toggleMusic);

        // Try to play immediately on load (usually blocked by browsers but worth a try)
        window.addEventListener('load', () => {
            bgMusic.play().then(() => {
                // If success, update UI
                isMusicPlaying = true;
                musicToggle.classList.add('playing');
                musicText.textContent = 'Music On';
            }).catch(error => {
                console.log("Autoplay prevented by browser. Waiting for interaction.");
            });
        });

        // Auto-start on first interaction anywhere on the page
        const handleFirstInteraction = () => {
            if (!isMusicPlaying) {
                toggleMusic();
            }
            // Remove all interaction listeners once started
            ['click', 'touchstart', 'mousedown', 'keydown'].forEach(type => {
                document.removeEventListener(type, handleFirstInteraction);
            });
        };

        ['click', 'touchstart', 'mousedown', 'keydown'].forEach(type => {
            document.addEventListener(type, handleFirstInteraction);
        });
    }
});
