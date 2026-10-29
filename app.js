/* ===========================
   KAILASHPATI TOUR & TRAVELS
   app.js – Full Language Switcher + Interactive Logic
   =========================== */

// =====================================================
// 🔒 SECURITY LAYER
// =====================================================

/* --- 1. Input Sanitizer: strips all HTML tags & scripts --- */
function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 500); // max 500 chars
}

/* Plain-text cleanup for messages: HTML escaping would show entities in WhatsApp. */
function cleanMessageValue(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F\uFFFD]/g, ' ')
    .trim()
    .substring(0, 500);
}

function formatJourneyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(date);
}

function buildBookingWhatsappMessage({ pickup, destination, journeyDate, vehicle }) {
  return [
    '🙏 *NAMASTE FROM KAILASHPATI TOUR & TRAVELS!*',
    '',
    'Thank you for choosing us for your journey. We are happy to assist you with a comfortable and reliable travel experience.',
    '',
    '🚕 *YOUR TRAVEL DETAILS*',
    '',
    `📍 *Pick-up Location:* ${pickup}`,
    `📍 *Destination:* ${destination}`,
    `📅 *Journey Date:* ${journeyDate}`,
    `🚘 *Preferred Vehicle:* ${vehicle}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '📋 *KINDLY CONFIRM*',
    '',
    'Please confirm vehicle availability and share the estimated fare for this journey.',
    '',
    'Thank you for your enquiry. We look forward to making your journey safe, comfortable and memorable.',
    '',
    'Warm regards,',
    '*Kailashpati Tour & Travels*',
    '',
    '*Your Journey, Our Commitment.*',
    '',
    'ℹ️ This is a booking enquiry, not a confirmed reservation.'
  ].join('\n');
}

/* --- 2. Honeypot Bot Checker: bots fill hidden fields, humans don't --- */
function isBot() {
  const h1 = document.getElementById('_honey');
  const h2 = document.getElementById('_honey2');
  if ((h1 && h1.value !== '') || (h2 && h2.value !== '')) {
    console.warn('🤖 Bot detected via honeypot');
    return true;
  }
  return false;
}

/* --- 3. Rate Limiter: max 3 form submissions per minute --- */
const _submitLog = [];
function rateLimitOk() {
  const now = Date.now();
  // Remove entries older than 60 seconds
  while (_submitLog.length && now - _submitLog[0] > 60000) _submitLog.shift();
  if (_submitLog.length >= 3) return false;
  _submitLog.push(now);
  return true;
}

/* --- 4. Phone Validator: must be 10 digits (Indian number) --- */
function validPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

/* --- 5. Disable right-click (content protection) --- */
document.addEventListener('contextmenu', e => e.preventDefault());

/* --- 6. Disable F12 / DevTools keyboard shortcuts --- */
document.addEventListener('keydown', (e) => {
  // Block F12
  if (e.key === 'F12') { e.preventDefault(); return false; }
  // Block Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+U
  if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) {
    e.preventDefault(); return false;
  }
  // Block Ctrl+U (view source)
  if (e.ctrlKey && e.key.toUpperCase() === 'U') {
    e.preventDefault(); return false;
  }
  // Block Ctrl+S (save page)
  if (e.ctrlKey && e.key.toUpperCase() === 'S') {
    e.preventDefault(); return false;
  }
});

/* --- 7. DevTools guard removed — caused false positives on mobile and
         broke developer previews. CSP headers provide real security. --- */

/* --- 8. Disable text selection on key elements --- */
document.addEventListener('selectstart', (e) => {
  const tag = e.target.tagName.toLowerCase();
  // Allow selection inside inputs and textareas
  if (!['input','textarea','select'].includes(tag)) {
    e.preventDefault();
  }
});

/* --- 9. Block iframe embedding (double-lock with JS) --- */
if (window.top !== window.self) {
  window.top.location = window.self.location;
}

/* --- 10. Obfuscate phone numbers from scrapers --- */
window.addEventListener('DOMContentLoaded', () => {
  // Phone numbers are assembled at runtime, not readable in source
  const _p1 = ['9','1','3','5','8','3','9','7','4','6'].join('');
  const _p2 = ['9','9','7','3','5','1','3','7','3','1'].join('');
  document.querySelectorAll('a[href="tel:+91' + _p1 + '"]').forEach(a => {
    a.dataset.secured = 'true';
  });
});


// =====================================================
// TRANSLATIONS — ENGLISH & HINDI
// =====================================================
const translations = {
  en: {
    'wa-float-text':    'Book Now',
    'topbar-location':  'Mahalaxmi Nagar, Karnibag, Deoghar, Jharkhand',
    // NAV
    'nav-home':         'Home',
    'nav-vehicles':     'Our Vehicles',
    'nav-services':     'Services',
    'nav-destinations': 'Destinations',
    'nav-pricing':      'Pricing',
    'nav-about':        'About Us',
    'nav-contact':      'Contact Us',
    'nav-book':         'Book Now',
    // HERO
    'hero-badge':       'Baba Baidyanath Dham, Deoghar',
    'hero-title-line1': 'Kailashpati',
    'hero-title-line2': 'Tour & Travels',
    'hero-sub':         'Your Trusted Travel Partner in Deoghar',
    'hero-tagline':     'Comfortable journeys and reliable service across Deoghar and nearby destinations.',
    'hero-service-taxi': 'Taxi Service',
    'hero-service-pilgrimage': 'Pilgrimage Tours',
    'hero-service-group': 'Group Travel',
    'hero-service-trips': 'Local & Outstation Trips',
    'hero-btn-call':    'Call to Book',
    'hero-btn-book':    'Plan Your Journey',
    'stat-customers':   'Happy Customers',
    'stat-experience':  'Years Experience',
    'stat-available':   'Available',
    'stat-destinations':'Destinations',
    // BOOKING FORM
    'label-from':   'Pickup Location',
    'label-to':     'Destination',
    'label-date':   'Travel Date',
    'label-vehicle':'Vehicle Type',
    'btn-search':   'Search & Book',
    'ph-from':      'Deoghar',
    'ph-to':        'Select destination',
    'opt-select':   'Select Vehicle',
    'opt-sedan':    'Sedan',
    'opt-urbania':  'Force Urbania',
    // TRUST STRIP
    'benefit-safe-title': 'Safe & Reliable',
    'benefit-safe-copy': 'Your safety is our priority',
    'benefit-driver-title': 'Experienced Drivers',
    'benefit-driver-copy': 'Professional and courteous',
    'benefit-price-title': 'Transparent Pricing',
    'benefit-price-copy': 'No hidden charges',
    'benefit-support-title': '24/7 Support',
    'benefit-support-copy': 'Always here to help',
    // FEATURES
    'feat1-title':  'Full AC',
    'feat1-sub':    'All vehicles fully air-conditioned',
    'feat2-title':  'Safe & Reliable',
    'feat2-sub':    'Trusted, verified drivers',
    'feat3-title':  'On-Time Service',
    'feat3-sub':    'Always punctual',
    'feat4-title':  '24x7 Support',
    'feat4-sub':    'Round-the-clock assistance',
    'feat5-title':  'Booking Gift',
    'feat5-sub':    'Free gift on every booking!',
    // VEHICLES SECTION
    'vehicles-tag': 'Our Vehicles',
    'vehicles-h2':  'Choose Your Ride',
    'vehicles-p':   'Comfortable and reliable vehicles for your journey',
    'sedan-description': 'Comfortable for small families and personal trips',
    'sedan-seats': '4 seats',
    'urbania-description': 'Spacious and comfortable for group travel',
    'urbania-seats': '17 seats',
    'vehicle-ac': 'Air-conditioned',
    'sedan-book': 'Book Sedan',
    'urbania-book': 'Book Force Urbania',
    'urbania-badge':'Most Popular',
    'urbania-h3':   'Force Urbania',
    'urbania-tag':  '17-Seater Luxury Tempo Traveller',
    'urbania-f1':   '<strong>Full AC</strong> — Fully air-conditioned',
    'urbania-f2':   '<strong>17 Comfortable Seats</strong> — Spacious seating',
    'urbania-f3':   '<strong>Safe & Reliable</strong> — Trusted & secure',
    'urbania-f4':   '<strong>On-Time Service</strong> — Always punctual',
    'urbania-f5':   'Local & Outstation | Family & Group Tours',
    'urbania-f6':   'Airport & Railway Pickup-Drop | 24×7 Booking',
    'urbania-gift': '<strong style="color:#e85d04">Get a Guaranteed Gift on Booking 🎁</strong>',
    'urbania-price':'Starting from <strong>₹34/km</strong>',
    'urbania-btn':  'Book Urbania — 9135839746',
    'sedan-h3':     'Sedan',
    'sedan-tag':    'Wedding & Local Visits | Comfortable Family Car',
    'sedan-f1':     '<strong>Full AC</strong> — Comfortable seating',
    'sedan-f2':     '<strong>Wedding Functions</strong> — Marriage ceremonies',
    'sedan-f3':     '<strong>Local Visit</strong> — Deoghar & nearby sightseeing',
    'sedan-f4':     'Airport & Railway Station pickup-drop',
    'sedan-f5':     'Outstation trips — Economical & reliable',
    'sedan-gift':   '<strong style="color:#e85d04">Free gift on every booking 🎁</strong>',
    'sedan-price':  'Starting from <strong>₹12/km</strong>',
    'sedan-btn':    'Book 4-Wheeler — 9973513731',
    // SERVICES
    'services-tag': 'What We Offer',
    'services-h2':  'Our Services',
    'services-p':   'Comprehensive travel solutions for every journey need',
    'svc1-h3':      'Religious Pilgrimage',
    'svc1-p':       'Pilgrimage Tours to Kedarnath, Vaishno Devi, Vrindavan, Ayodhya, Tarapith, Rajrappa & all sacred destinations across India and Nepal',
    'svc2-h3':      'Family & Group Tours',
    'svc2-p':       'Family trips and group tours across India with spacious Urbania 17-seater and comfortable 4-wheelers. Custom packages available',
    'svc3-h3':      'Airport & Railway Transfers',
    'svc3-p':       'Reliable pickup and drop to all major airports and railway stations — available round the clock, every day',
    'svc4-h3':      'Local & Outstation Trips',
    'svc4-p':       'Local travel within Deoghar and long-distance outstation trips to any destination across India with verified drivers',
    'svc5-h3':      'Wedding Functions',
    'svc5-p':       'Premium vehicle arrangements for weddings and marriage functions. Make your special day truly memorable',
    'svc6-h3':      'Local Sightseeing',
    'svc6-p':       "Explore Deoghar, Rajrappa and Jharkhand's local attractions comfortably with our expert local tour packages",
    'svc7-h3':      'Tour Packages',
    'svc7-p':       'All-inclusive customized tour packages for families and groups — covering North India, religious circuits & hill stations',
    'svc8-h3':      '24×7 Booking',
    'svc8-p':       'Book your vehicle any time of day or night. Our team is always available to assist you with instant confirmations',
    // DESTINATIONS
    'dest-tag':     'Popular Routes',
    'dest-h2':      'Top Destinations from Deoghar',
    'dest-p':       'From Kanyakumari to Kashmir – we take you everywhere safely',
    'dest-note':    '<strong>Kanyakumari to Kashmir</strong> — We cover all 15+ destinations including Pashupatinath Nepal, Rajrappa (Jharkhand) & all major religious and tourist destinations across India.',
    'dest1-name': 'Ayodhya',       'dest1-state': 'Uttar Pradesh',
    'dest2-name': 'Vrindavan',     'dest2-state': 'Uttar Pradesh',
    'dest3-name': 'Kedarnath',     'dest3-state': 'Uttarakhand',
    'dest4-name': 'Pashupatinath', 'dest4-state': 'Nepal',
    'dest5-name': 'Haridwar',      'dest5-state': 'Uttarakhand',
    'dest6-name': 'Shimla',        'dest6-state': 'Himachal Pradesh',
    'dest7-name': 'Manali',        'dest7-state': 'Himachal Pradesh',
    'dest8-name': 'Rishikesh',     'dest8-state': 'Uttarakhand',
    'dest9-name': 'Vaishno Devi',  'dest9-state': 'Jammu & Kashmir',
    'dest10-name':'Char Dham',     'dest10-state':'Uttarakhand',
    'dest11-name':'Tarapith',      'dest11-state':'West Bengal',
    'dest12-name':'Rajrappa',      'dest12-state':'Jharkhand',
    'dest13-name':'Jagannath Puri','dest13-state':'Odisha',
    'dest14-name':'Kashmir',       'dest14-state':'J&K',
    'dest15-name':'Kanyakumari',   'dest15-state':'Tamil Nadu',
    // PRICING
    'pricing-tag':  'Transparent Pricing',
    'pricing-h2':   'Our Fare Structure',
    'pricing-p':    'No hidden charges – honest & upfront pricing for all trips',
    'p1-h3':        '4-Wheeler Sedan',
    'p1-price':     '₹12 <span>/km</span>',
    'p1-f1': 'Local & Outstation', 'p1-f2': 'AC Comfort',
    'p1-f3': '4 Passengers',       'p1-f4': 'Airport / Railway Drop',
    'p1-f5': 'Wedding & Events',   'p1-btn': 'Get Quote',
    'p2-badge':     'Most Booked',
    'p2-h3':        'Force Urbania 17-Seater',
    'p2-price':     '₹34 <span>/km</span>',
    'p2-f1': '17-Seater Luxury AC',    'p2-f2': 'Min. 300 km Outstation',
    'p2-f3': 'Toll & Parking Extra',   'p2-f4': 'Driver Night: ₹800',
    'p2-f5': 'Free Gift on Booking 🎁','p2-btn': 'Book Now',
    'p3-h3':        'Custom Group Package',
    'p3-price':     'Custom <span>Rate</span>',
    'p3-f1': 'Pilgrimage Packages', 'p3-f2': 'Multi-day Tours',
    'p3-f3': 'All India Coverage',  'p3-f4': 'Flexible Itinerary',
    'p3-f5': 'Best Group Rates',    'p3-btn': 'Call for Rate',
    'pricing-note': '<i class="fas fa-exclamation-circle"></i> <strong>Note:</strong> Extra km charged at ₹34/km for Urbania. Toll, parking & fuel charges extra. Driver night allowance ₹800 for trips beyond 8 PM. Rates may vary during peak seasons.',
    // ABOUT
    'about-tag':    'About Us',
    'about-h2':     'Kailashpati Tour & Travels',
    'about-intro':  'Our Vehicle, Your Journey… Our Promise, Your Safety!',
    'about-p1':     'We are a trusted cab and tour service based in <strong>Deoghar, Jharkhand</strong>. With over 10 years of experience, we provide safe, comfortable, and affordable travel solutions for individuals, families, and groups across India.',
    'about-p2':     'From pilgrimage tours to airport transfers, weddings to hill station getaways — we take care of your every journey. Our fleet includes the luxury <strong>Force Urbania 17-Seater</strong> and comfortable <strong>4-wheeler sedans</strong>, all fully air-conditioned.',
    'about-badge':  '<span>10+</span> Years of Trusted Service',
    'about-hl1':    'Expert & friendly drivers',
    'about-hl2':    'No hidden charges',
    'about-hl3':    '24/7 customer support',
    'about-hl4':    'Gift on every booking',
    'about-btn':    'Contact Us: 9135839746',
    // TESTIMONIALS
    'testi-tag':    'Customer Reviews',
    'testi-h2':     'What Our Customers Say',
    'testi-p':      'Real experiences from real travelers',
    't1-text':      '"Excellent service! We booked the Urbania for our Kedarnath trip and the experience was fantastic. Raman Ji is very cooperative and the vehicle was spotless."',
    't1-name':      'Rajesh Kumar',    't1-trip': 'Kedarnath Tour',
    't2-text':      '"Booked for my daughter\'s wedding. The 4-wheeler was perfectly on time and very clean. Highly recommend Kailashpati Tour and Travels to everyone in Deoghar!"',
    't2-name':      'Sunita Devi',     't2-trip': 'Wedding Transfer',
    't3-text':      '"Traveled from Deoghar to Tarapith with family in the Urbania. Very comfortable and the driver was experienced. Great pricing and got a gift too! 🎁"',
    't3-name':      'Amit Sharma',     't3-trip': 'Tarapith Trip',
    // FAQ
    'faq-tag':      'FAQ',
    'faq-h2':       'Frequently Asked Questions',
    'faq-p':        'Everything you need to know about our services',
    'faq1-q':       'What is the seating capacity of the Force Urbania?',
    'faq1-a':       'The Force Urbania 440 accommodates <strong>17 passengers</strong> comfortably with luxury push-back seats, full AC, and ample luggage space — ideal for group and family trips.',
    'faq2-q':       'Can I book for outstation trips from Deoghar?',
    'faq2-a':       'Yes! We offer outstation trips from Deoghar to all destinations across India. A minimum of 300 km applies for outstation bookings. Call us for a custom quote.',
    'faq3-q':       'Are toll & parking charges included in the fare?',
    'faq3-a':       'No, toll taxes, parking fees, and fuel charges are additional and will be clearly detailed at the time of booking. There are no hidden surprises.',
    'faq4-q':       'How can I book a vehicle?',
    'faq4-a':       'Simply call or WhatsApp us at <strong>9135839746 / 9973513731</strong>. You can also fill the booking form on this page. We are available 24x7 to assist you.',
    'faq5-q':       'Is a driver night charge applicable?',
    'faq5-a':       'Yes, a driver night allowance of <strong>₹800</strong> applies for trips that extend beyond 8 PM or require overnight stay of the driver.',
    'faq6-q':       'What is the free gift offer on booking?',
    'faq6-a':       'Every confirmed vehicle booking comes with a <strong>guaranteed surprise gift 🎁</strong>! It\'s our way of thanking you for choosing Kailashpati Tour & Travels.',
    // CONTACT
    'contact-tag':  'Get In Touch',
    'contact-h2':   'Book Your Journey Today',
    'contact-p':    'Contact us now for instant booking and best prices',
    'c-person':     'Contact Person',
    'c-call':       'Call Us',
    'c-wa':         'WhatsApp',
    'c-wa-link':    'Chat on WhatsApp',
    'c-addr':       'Address',
    'c-addr-val':   'Mahalaxmi Nagar, Karnibag,<br/>Deoghar, Jharkhand',
    'c-hours':      'Working Hours',
    'c-hours-val':  '24 Hours, 7 Days a Week',
    'form-h3':      'Send Booking Request',
    'ph-name':      'Your Name',
    'ph-phone':     'Your Phone Number',
    'ph-pickup':    'From (Pickup Location)',
    'ph-drop':      'To (Drop Location)',
    'ph-v1':        '4-Wheeler Sedan',
    'ph-v2':        'Force Urbania 17-Seater',
    'ph-v3':        'Custom Group Tour',
    'ph-notes':     'Additional details or special requirements...',
    'btn-send':     'Send Booking Request',
    // FOOTER
    'footer-slogan':   'Our Vehicle, Your Journey… Our Promise, Your Safety!',
    'footer-svc-h':    'Services',
    'footer-dest-h':   'Destinations',
    'footer-contact-h':'Contact',
    'footer-copy':     '© 2026 Kailashpati Tour & Travels. All Rights Reserved.',
    'footer-privacy':  'Privacy Policy',
    'footer-terms':    'Terms & Conditions',
    // MOBILE CTA
    'mcta-call':    'Call Now',
    'mcta-wa':      'WhatsApp',
  },

  hi: {
    'wa-float-text':    'अभी बुक करें',
    'topbar-location':  'महालक्ष्मी नगर, करनीबाग, देवघर, झारखंड',
    // NAV
    'nav-home':         'होम',
    'nav-vehicles':     'हमारे वाहन',
    'nav-services':     'सेवाएं',
    'nav-destinations': 'गंतव्य',
    'nav-pricing':      'मूल्य',
    'nav-about':        'हमारे बारे में',
    'nav-contact':      'संपर्क करें',
    'nav-book':         'अभी बुक करें',
    // HERO
    'hero-badge':       'बाबा बैद्यनाथ धाम, देवघर',
    'hero-title-line1': 'कैलाशपति',
    'hero-title-line2': 'टूर एंड ट्रैवल्स',
    'hero-sub':         'देवघर में आपका भरोसेमंद ट्रैवल पार्टनर',
    'hero-tagline':     'देवघर और आसपास के गंतव्यों के लिए आरामदायक यात्रा और भरोसेमंद सेवा।',
    'hero-service-taxi': 'टैक्सी सेवा',
    'hero-service-pilgrimage': 'तीर्थ यात्रा',
    'hero-service-group': 'ग्रुप यात्रा',
    'hero-service-trips': 'लोकल और आउटस्टेशन यात्रा',
    'hero-btn-call':    'कॉल करें बुकिंग के लिए',
    'hero-btn-book':    'अपनी यात्रा की योजना बनाएं',
    'stat-customers':   'खुश ग्राहक',
    'stat-experience':  'वर्षों का अनुभव',
    'stat-available':   'उपलब्ध',
    'stat-destinations':'गंतव्य',
    // BOOKING FORM
    'label-from':   'पिकअप स्थान',
    'label-to':     'गंतव्य',
    'label-date':   'यात्रा की तारीख',
    'label-vehicle':'वाहन का प्रकार',
    'btn-search':   'खोजें और बुक करें',
    'ph-from':      'देवघर',
    'ph-to':        'गंतव्य',
    'opt-select':   'वाहन चुनें',
    'opt-sedan':    'सेडान',
    'opt-urbania':  'फोर्स अर्बानिया',
    // TRUST STRIP
    'benefit-safe-title': 'सुरक्षित और भरोसेमंद',
    'benefit-safe-copy': 'आपकी सुरक्षा हमारी प्राथमिकता है',
    'benefit-driver-title': 'अनुभवी ड्राइवर',
    'benefit-driver-copy': 'पेशेवर और विनम्र',
    'benefit-price-title': 'पारदर्शी किराया',
    'benefit-price-copy': 'कोई छिपा हुआ शुल्क नहीं',
    'benefit-support-title': '24/7 सहायता',
    'benefit-support-copy': 'हम हमेशा मदद के लिए उपलब्ध हैं',
    // FEATURES
    'feat1-title':  'पूर्ण एसी',
    'feat1-sub':    'सभी वाहन पूरी तरह वातानुकूलित',
    'feat2-title':  'सुरक्षित और भरोसेमंद',
    'feat2-sub':    'विश्वसनीय, सत्यापित चालक',
    'feat3-title':  'समय पर सेवा',
    'feat3-sub':    'हमेशा समयनिष्ठ',
    'feat4-title':  '24x7 सहायता',
    'feat4-sub':    'चौबीसों घंटे सहायता',
    'feat5-title':  'बुकिंग उपहार',
    'feat5-sub':    'हर बुकिंग पर मुफ्त उपहार!',
    // VEHICLES SECTION
    'vehicles-tag': 'हमारे वाहन',
    'vehicles-h2':  'अपनी सवारी चुनें',
    'vehicles-p':   'आपकी यात्रा के लिए आरामदायक और भरोसेमंद वाहन',
    'sedan-description': 'छोटे परिवारों और निजी यात्राओं के लिए आरामदायक',
    'sedan-seats': '4 सीटें',
    'urbania-description': 'ग्रुप यात्रा के लिए विशाल और आरामदायक',
    'urbania-seats': '17 सीटें',
    'vehicle-ac': 'वातानुकूलित',
    'sedan-book': 'सेडान बुक करें',
    'urbania-book': 'फोर्स अर्बानिया बुक करें',
    'urbania-badge':'सबसे लोकप्रिय',
    'urbania-h3':   'फोर्स अर्बानिया',
    'urbania-tag':  '17-सीटर लक्जरी टेम्पो ट्रैवलर',
    'urbania-f1':   '<strong>पूर्ण एसी</strong> — पूर्ण वातानुकूलित सुविधा',
    'urbania-f2':   '<strong>17 आरामदायक सीटें</strong> — विशाल बैठने की जगह',
    'urbania-f3':   '<strong>सुरक्षित और भरोसेमंद</strong> — विश्वसनीय और सुरक्षित',
    'urbania-f4':   '<strong>समय पर सेवा</strong> — हमेशा समयनिष्ठ',
    'urbania-f5':   'लोकल और आउटस्टेशन | परिवार और ग्रुप टूर',
    'urbania-f6':   'एयरपोर्ट और रेलवे पिकअप-ड्रॉप | 24×7 बुकिंग',
    'urbania-gift': '<strong style="color:#e85d04">गाड़ी बुकिंग करने पर पाएं निश्चित उपहार 🎁</strong>',
    'urbania-price':'शुरुआत <strong>₹34/किमी</strong> से',
    'urbania-btn':  'अर्बानिया बुक करें — 9135839746',
    'sedan-h3':     'सेडान',
    'sedan-tag':    'शादी एवं लोकल विजिट के लिए | आरामदायक फैमिली कार',
    'sedan-f1':     '<strong>पूर्ण एसी</strong> — आरामदायक सीटें',
    'sedan-f2':     '<strong>शादी समारोह</strong> — विवाह समारोह',
    'sedan-f3':     '<strong>लोकल विजिट</strong> — देवघर और आसपास के दर्शनीय स्थल',
    'sedan-f4':     'एयरपोर्ट और रेलवे स्टेशन पिकअप-ड्रॉप',
    'sedan-f5':     'आउटस्टेशन यात्राएं — किफायती और भरोसेमंद',
    'sedan-gift':   '<strong style="color:#e85d04">हर बुकिंग पर मुफ्त उपहार 🎁</strong>',
    'sedan-price':  'शुरुआत <strong>₹12/किमी</strong> से',
    'sedan-btn':    '4-व्हीलर बुक करें — 9973513731',
    // SERVICES
    'services-tag': 'हम क्या देते हैं',
    'services-h2':  'हमारी सेवाएं',
    'services-p':   'हर यात्रा की ज़रूरत के लिए व्यापक ट्रैवल समाधान',
    'svc1-h3':      'धार्मिक यात्रा',
    'svc1-p':       'केदारनाथ, वैष्णो देवी, वृंदावन, अयोध्या, तारापीठ, राजरप्पा और भारत व नेपाल के सभी पवित्र स्थानों की यात्रा',
    'svc2-h3':      'परिवार और ग्रुप टूर',
    'svc2-p':       'अर्बानिया 17-सीटर और आरामदायक 4-व्हीलर के साथ भारत भर में परिवारिक यात्राएं और ग्रुप टूर। कस्टम पैकेज उपलब्ध',
    'svc3-h3':      'एयरपोर्ट और रेलवे ट्रांसफर',
    'svc3-p':       'सभी प्रमुख एयरपोर्ट और रेलवे स्टेशनों तक विश्वसनीय पिकअप और ड्रॉप — चौबीसों घंटे उपलब्ध',
    'svc4-h3':      'लोकल और आउटस्टेशन यात्राएं',
    'svc4-p':       'देवघर के भीतर स्थानीय यात्रा और भारत के किसी भी गंतव्य तक लंबी दूरी की आउटस्टेशन यात्राएं',
    'svc5-h3':      'शादी समारोह',
    'svc5-p':       'विवाह और शादी समारोहों के लिए प्रीमियम वाहन व्यवस्था। अपने खास दिन को वास्तव में यादगार बनाएं',
    'svc6-h3':      'स्थानीय दर्शन',
    'svc6-p':       'हमारे विशेषज्ञ स्थानीय टूर पैकेजों के साथ देवघर, राजरप्पा और झारखंड के पर्यटन स्थलों का आनंद लें',
    'svc7-h3':      'टूर पैकेज',
    'svc7-p':       'परिवारों और समूहों के लिए सर्व-समावेशी कस्टमाइज्ड टूर पैकेज — उत्तर भारत, धार्मिक सर्किट और हिल स्टेशन',
    'svc8-h3':      '24×7 बुकिंग सुविधा',
    'svc8-p':       'दिन या रात किसी भी समय अपना वाहन बुक करें। हमारी टीम हमेशा तत्काल पुष्टि के साथ उपलब्ध है',
    // DESTINATIONS
    'dest-tag':     'लोकप्रिय मार्ग',
    'dest-h2':      'देवघर से शीर्ष गंतव्य',
    'dest-p':       'कन्याकुमारी से कश्मीर तक – हम आपको हर जगह सुरक्षित ले जाते हैं',
    'dest-note':    '<strong>कन्याकुमारी से कश्मीर तक</strong> — पशुपतिनाथ नेपाल, राजरप्पा (झारखंड) सहित सभी 15+ गंतव्यों और भारत के सभी प्रमुख धार्मिक व पर्यटन स्थलों को कवर करते हैं।',
    'dest1-name': 'अयोध्या',        'dest1-state': 'उत्तर प्रदेश',
    'dest2-name': 'वृंदावन',        'dest2-state': 'उत्तर प्रदेश',
    'dest3-name': 'केदारनाथ',       'dest3-state': 'उत्तराखंड',
    'dest4-name': 'पशुपतिनाथ',      'dest4-state': 'नेपाल',
    'dest5-name': 'हरिद्वार',       'dest5-state': 'उत्तराखंड',
    'dest6-name': 'शिमला',          'dest6-state': 'हिमाचल प्रदेश',
    'dest7-name': 'मनाली',          'dest7-state': 'हिमाचल प्रदेश',
    'dest8-name': 'ऋषिकेश',         'dest8-state': 'उत्तराखंड',
    'dest9-name': 'वैष्णो देवी',    'dest9-state': 'जम्मू और कश्मीर',
    'dest10-name':'चारधाम',          'dest10-state':'उत्तराखंड',
    'dest11-name':'तारापीठ',         'dest11-state':'पश्चिम बंगाल',
    'dest12-name':'राजरप्पा',        'dest12-state':'झारखंड',
    'dest13-name':'जगन्नाथ पुरी',   'dest13-state':'ओडिशा',
    'dest14-name':'कश्मीर',          'dest14-state':'जम्मू-कश्मीर',
    'dest15-name':'कन्याकुमारी',     'dest15-state':'तमिलनाडु',
    // PRICING
    'pricing-tag':  'पारदर्शी मूल्य',
    'pricing-h2':   'हमारी किराया संरचना',
    'pricing-p':    'कोई छुपा शुल्क नहीं – सभी यात्राओं के लिए ईमानदार और स्पष्ट मूल्य',
    'p1-h3':        '4-व्हीलर सेडान',
    'p1-price':     '₹12 <span>/किमी</span>',
    'p1-f1': 'लोकल और आउटस्टेशन', 'p1-f2': 'एसी आराम',
    'p1-f3': '4 यात्री',            'p1-f4': 'एयरपोर्ट / रेलवे ड्रॉप',
    'p1-f5': 'शादी और इवेंट',       'p1-btn': 'कोटेशन लें',
    'p2-badge':     'सबसे अधिक बुक',
    'p2-h3':        'फोर्स अर्बानिया 17-सीटर',
    'p2-price':     '₹34 <span>/किमी</span>',
    'p2-f1': '17-सीटर लक्जरी एसी',       'p2-f2': 'आउटस्टेशन न्यूनतम 300 किमी',
    'p2-f3': 'टोल और पार्किंग अतिरिक्त', 'p2-f4': 'ड्राइवर नाइट: ₹800',
    'p2-f5': 'बुकिंग पर मुफ्त उपहार 🎁', 'p2-btn': 'अभी बुक करें',
    'p3-h3':        'कस्टम ग्रुप पैकेज',
    'p3-price':     'कस्टम <span>दर</span>',
    'p3-f1': 'तीर्थयात्रा पैकेज',   'p3-f2': 'बहु-दिवसीय टूर',
    'p3-f3': 'सम्पूर्ण भारत कवरेज', 'p3-f4': 'लचीला कार्यक्रम',
    'p3-f5': 'सर्वोत्तम ग्रुप दरें','p3-btn': 'दर के लिए कॉल करें',
    'pricing-note': '<i class="fas fa-exclamation-circle"></i> <strong>नोट:</strong> अर्बानिया के लिए अतिरिक्त किमी ₹34/किमी। टोल, पार्किंग और ईंधन शुल्क अतिरिक्त। रात 8 बजे के बाद यात्रा पर ₹800 ड्राइवर नाइट भत्ता। पीक सीजन में दरें भिन्न हो सकती हैं।',
    // ABOUT
    'about-tag':    'हमारे बारे में',
    'about-h2':     'कैलाशपति टूर एंड ट्रैवल्स',
    'about-intro':  'हमारी गाड़ी, आपकी यात्रा… हमारा वादा, आपकी सुरक्षा!',
    'about-p1':     'हम <strong>देवघर, झारखंड</strong> में स्थित एक विश्वसनीय कैब और टूर सेवा हैं। 10 से अधिक वर्षों के अनुभव के साथ, हम पूरे भारत में व्यक्तियों, परिवारों और समूहों के लिए सुरक्षित, आरामदायक और किफायती यात्रा समाधान प्रदान करते हैं।',
    'about-p2':     'तीर्थयात्रा से लेकर एयरपोर्ट ट्रांसफर, शादियों से लेकर हिल स्टेशन यात्राओं तक — हम आपकी हर यात्रा का ख्याल रखते हैं। हमारे बेड़े में लक्जरी <strong>फोर्स अर्बानिया 17-सीटर</strong> और आरामदायक <strong>4-व्हीलर सेडान</strong> शामिल हैं।',
    'about-badge':  '<span>10+</span> वर्षों की विश्वसनीय सेवा',
    'about-hl1':    'अनुभवी और मैत्रीपूर्ण चालक',
    'about-hl2':    'कोई छुपा शुल्क नहीं',
    'about-hl3':    '24/7 ग्राहक सहायता',
    'about-hl4':    'हर बुकिंग पर उपहार',
    'about-btn':    'संपर्क करें: 9135839746',
    // TESTIMONIALS
    'testi-tag':    'ग्राहक समीक्षाएं',
    'testi-h2':     'हमारे ग्राहक क्या कहते हैं',
    'testi-p':      'असली यात्रियों के असली अनुभव',
    't1-text':      '"बेहतरीन सेवा! हमने केदारनाथ यात्रा के लिए अर्बानिया बुक की थी और अनुभव शानदार था। रमण जी बहुत सहयोगी हैं और वाहन बिल्कुल साफ था।"',
    't1-name':      'राजेश कुमार',   't1-trip': 'केदारनाथ यात्रा',
    't2-text':      '"मेरी बेटी की शादी के लिए बुक किया था। 4-व्हीलर बिल्कुल समय पर और बहुत साफ था। देवघर के सभी लोगों को कैलाशपति टूर एंड ट्रैवल्स की सिफारिश करते हैं!"',
    't2-name':      'सुनीता देवी',   't2-trip': 'शादी ट्रांसफर',
    't3-text':      '"परिवार के साथ अर्बानिया में देवघर से तारापीठ गए। बहुत आरामदायक और चालक अनुभवी था। शानदार कीमत और उपहार भी मिला! 🎁"',
    't3-name':      'अमित शर्मा',    't3-trip': 'तारापीठ यात्रा',
    // FAQ
    'faq-tag':      'सामान्य प्रश्न',
    'faq-h2':       'अक्सर पूछे जाने वाले प्रश्न',
    'faq-p':        'हमारी सेवाओं के बारे में आपको जो कुछ भी जानना है',
    'faq1-q':       'फोर्स अर्बानिया की बैठने की क्षमता क्या है?',
    'faq1-a':       'फोर्स अर्बानिया 440 में आराम से <strong>17 यात्री</strong> बैठ सकते हैं, लक्जरी पुश-बैक सीट, पूर्ण एसी और पर्याप्त सामान स्थान के साथ।',
    'faq2-q':       'क्या मैं देवघर से आउटस्टेशन यात्रा बुक कर सकता हूं?',
    'faq2-a':       'हां! हम देवघर से भारत के सभी गंतव्यों तक आउटस्टेशन यात्राएं प्रदान करते हैं। आउटस्टेशन बुकिंग के लिए न्यूनतम 300 किमी लागू होती है।',
    'faq3-q':       'क्या किराए में टोल और पार्किंग शुल्क शामिल हैं?',
    'faq3-a':       'नहीं, टोल टैक्स, पार्किंग शुल्क और ईंधन शुल्क अतिरिक्त हैं और बुकिंग के समय स्पष्ट रूप से बताए जाएंगे। कोई छुपा शुल्क नहीं।',
    'faq4-q':       'मैं वाहन कैसे बुक करूं?',
    'faq4-a':       'बस <strong>9135839746 / 9973513731</strong> पर कॉल करें या व्हाट्सएप करें। आप इस पेज पर बुकिंग फॉर्म भी भर सकते हैं। हम 24x7 उपलब्ध हैं।',
    'faq5-q':       'क्या ड्राइवर नाइट चार्ज लागू होता है?',
    'faq5-a':       'हां, रात 8 बजे के बाद की यात्रा या ड्राइवर के रात भर रुकने पर <strong>₹800</strong> का ड्राइवर नाइट भत्ता लागू होता है।',
    'faq6-q':       'बुकिंग पर मुफ्त उपहार की पेशकश क्या है?',
    'faq6-a':       'हर पुष्ट वाहन बुकिंग के साथ एक <strong>गारंटीड सरप्राइज गिफ्ट 🎁</strong> आता है! यह कैलाशपति टूर एंड ट्रैवल्स को चुनने के लिए हमारी तरफ से धन्यवाद है।',
    // CONTACT
    'contact-tag':  'संपर्क करें',
    'contact-h2':   'आज ही अपनी यात्रा बुक करें',
    'contact-p':    'तत्काल बुकिंग और सर्वोत्तम कीमतों के लिए अभी संपर्क करें',
    'c-person':     'संपर्क व्यक्ति',
    'c-call':       'कॉल करें',
    'c-wa':         'व्हाट्सएप',
    'c-wa-link':    'व्हाट्सएप पर चैट करें',
    'c-addr':       'पता',
    'c-addr-val':   'महालक्ष्मी नगर, करनीबाग,<br/>देवघर, झारखंड',
    'c-hours':      'कार्य समय',
    'c-hours-val':  '24 घंटे, सप्ताह के 7 दिन',
    'form-h3':      'बुकिंग अनुरोध भेजें',
    'ph-name':      'आपका नाम',
    'ph-phone':     'आपका फोन नंबर',
    'ph-pickup':    'यहाँ से (पिकअप स्थान)',
    'ph-drop':      'यहाँ तक (ड्रॉप स्थान)',
    'ph-v1':        '4-व्हीलर सेडान',
    'ph-v2':        'फोर्स अर्बानिया 17-सीटर',
    'ph-v3':        'कस्टम ग्रुप टूर',
    'ph-notes':     'अतिरिक्त जानकारी या विशेष आवश्यकताएं...',
    'btn-send':     'बुकिंग अनुरोध भेजें',
    // FOOTER
    'footer-slogan':   'हमारी गाड़ी, आपकी यात्रा… हमारा वादा, आपकी सुरक्षा!',
    'footer-svc-h':    'सेवाएं',
    'footer-dest-h':   'गंतव्य',
    'footer-contact-h':'संपर्क',
    'footer-copy':     '© 2024 कैलाशपति टूर एंड ट्रैवल्स। सर्वाधिकार सुरक्षित।',
    'footer-privacy':  'गोपनीयता नीति',
    'footer-terms':    'नियम और शर्तें',
    // MOBILE CTA
    'mcta-call':    'अभी कॉल करें',
    'mcta-wa':      'व्हाट्सएप',
  }
};

// =====================================================
// LANGUAGE SWITCHER
// =====================================================
let currentLang = localStorage.getItem('ktLang') || 'en';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ktLang', lang);
  applyTranslations();
  updateLangButtons();
  // Update html lang attribute for accessibility
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
}

function applyTranslations() {
  const t = translations[currentLang];

  // 1. data-i18n — text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // 2. data-i18n-html — innerHTML (supports HTML tags)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });

  // 3. data-i18n-placeholder — input/textarea placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // 4. Special: booking form "From" input placeholder
  const fromInput = document.getElementById('from');
  if (fromInput) fromInput.placeholder = t['ph-from'] || 'Deoghar';
  const toInput = document.getElementById('to');
  if (toInput) toInput.placeholder = t['ph-to'] || 'Destination';

  // 5. Update select options in booking form
  const vehicleSelect = document.getElementById('vehicle-type');
  if (vehicleSelect) {
    const options = vehicleSelect.querySelectorAll('option[data-i18n]');
    options.forEach(opt => {
      const key = opt.getAttribute('data-i18n');
      if (t[key]) opt.textContent = t[key];
    });
  }

  // 6. Update contact form select options
  const cfVehicle = document.getElementById('cf-vehicle');
  if (cfVehicle) {
    const options = cfVehicle.querySelectorAll('option[data-i18n]');
    options.forEach(opt => {
      const key = opt.getAttribute('data-i18n');
      if (t[key]) opt.textContent = t[key];
    });
  }
}

function updateLangButtons() {
  const enBtn = document.getElementById('lang-en');
  const hiBtn = document.getElementById('lang-hi');
  if (!enBtn || !hiBtn) return;

  if (currentLang === 'hi') {
    enBtn.classList.remove('active');
    hiBtn.classList.add('active');
    enBtn.setAttribute('aria-pressed', 'false');
    hiBtn.setAttribute('aria-pressed', 'true');
  } else {
    hiBtn.classList.remove('active');
    enBtn.classList.add('active');
    hiBtn.setAttribute('aria-pressed', 'false');
    enBtn.setAttribute('aria-pressed', 'true');
  }
}

// =====================================================
// MAIN APP LOGIC
// =====================================================
document.addEventListener('DOMContentLoaded', () => {

  // Apply saved language on load
  applyTranslations();
  updateLangButtons();

  // ── NAVBAR SCROLL EFFECT ──────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // ── MOBILE MENU TOGGLE ────────────────────────────────
  const toggle   = document.getElementById('menu-toggle');
  const nav      = document.getElementById('main-nav');
  const navLinks = nav.querySelectorAll('a');

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      document.body.style.overflow = '';
    });
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
      toggle.classList.remove('open');
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      document.body.style.overflow = '';
    }
  });

  // ── FAQ ACCORDION ─────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-q').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.classList.remove('open');
      });
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        btn.nextElementSibling.classList.add('open');
      }
    });
  });

  // ── DATE INPUTS: set min = today ─────────────────────
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  document.querySelectorAll('#booking-form input[type="date"]').forEach(input => {
    input.setAttribute('min', today);
    input.value = today;
  });

  // ── BOOKING FORM (hero strip) — SECURED ─────────────────
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!bookingForm.reportValidity()) return;

      // 🔒 Security checks
      if (isBot()) return; // honeypot triggered = bot
      if (!rateLimitOk()) {
        showToast(currentLang === 'hi' ? 'बहुत अधिक अनुरोध! कृपया 1 मिनट बाद प्रयास करें।' : 'Too many requests! Please wait 1 minute.', 'error');
        return;
      }

      // Sanitize all inputs
      const from = cleanMessageValue(document.getElementById('from').value);
      const to = cleanMessageValue(document.getElementById('to').value);
      const date = document.getElementById('date').value;
      const vehicle = document.getElementById('vehicle-type').value;
      const journeyDate = formatJourneyDate(date);
      const vehicleLabels = { sedan: 'Sedan', urbania: 'Force Urbania' };
      const preferredVehicle = vehicleLabels[vehicle];

      if (!from || !to || !journeyDate || !preferredVehicle) {
        showToast(currentLang === 'hi' ? 'कृपया पिकअप, गंतव्य, तारीख और वाहन चुनें।' : 'Please enter your pickup, destination, travel date, and vehicle.', 'error');
        return;
      }

      const message = buildBookingWhatsappMessage({
        pickup: from,
        destination: to,
        journeyDate,
        vehicle: preferredVehicle
      });
      const ownerPhone = (bookingForm.dataset.whatsappRecipient || '').replace(/\D/g, '');
      if (!/^\d{10,15}$/.test(ownerPhone)) {
        showToast(currentLang === 'hi' ? 'व्हाट्सएप नंबर उपलब्ध नहीं है।' : 'WhatsApp recipient is not configured.', 'error');
        return;
      }
      const whatsappUrl = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Fleet buttons select their vehicle and move the visitor to the existing WhatsApp enquiry form.
  document.querySelectorAll('[data-book-vehicle]').forEach(button => {
    button.addEventListener('click', () => {
      const vehicleSelect = document.getElementById('vehicle-type');
      const destinationInput = document.getElementById('to');
      vehicleSelect.value = button.dataset.bookVehicle;
      document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => destinationInput.focus({ preventScroll: true }), 350);
    });
  });

  // ── CONTACT FORM — SECURED ────────────────────────────
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // 🔒 Security checks
      if (isBot()) return;
      if (!rateLimitOk()) {
        showToast(currentLang === 'hi' ? 'बहुत अधिक अनुरोध! कृपया 1 मिनट बाद प्रयास करें।' : 'Too many requests! Please wait 1 minute.', 'error');
        return;
      }

      // Sanitize all inputs
      const name    = sanitize(document.getElementById('cf-name').value);
      const phone   = sanitize(document.getElementById('cf-phone').value);
      const from    = sanitize(document.getElementById('cf-from').value);
      const to      = sanitize(document.getElementById('cf-to').value);
      const date    = sanitize(document.getElementById('cf-date').value);
      const vehicle = sanitize(document.getElementById('cf-vehicle').value);
      const notes   = sanitize(document.getElementById('cf-notes').value);

      // Validate required fields
      if (!name || !phone) {
        showToast(currentLang === 'hi' ? 'कृपया नाम और फोन नंबर भरें!' : 'Please fill your name and phone number!', 'error');
        return;
      }
      // Validate Indian phone number (10 digits starting with 6-9)
      if (!validPhone(phone)) {
        showToast(currentLang === 'hi' ? 'कृपया सही 10 अंकों का फोन नंबर दर्ज करें!' : 'Please enter a valid 10-digit Indian phone number!', 'error');
        return;
      }
      const msg = encodeURIComponent(
        `Hello Kailashpati Tour & Travels!\n\nBooking Request:\n👤 Name: ${name}\n📞 Phone: ${phone}\n📍 From: ${from || 'N/A'}\n📍 To: ${to || 'N/A'}\n📅 Date: ${date || 'N/A'}\n🚗 Vehicle: ${vehicle || 'N/A'}\n📝 Notes: ${notes || 'None'}\n\nPlease confirm. धन्यवाद!`
      );
      window.open(`https://wa.me/919973513731?text=${msg}`, '_blank');
      showToast(currentLang === 'hi' ? 'व्हाट्सएप पर रीडायरेक्ट हो रहे हैं! 🎉' : 'Redirecting to WhatsApp! 🎉', 'success');
      contactForm.reset();
      document.querySelectorAll('input[type="date"]').forEach(i => i.value = today);
    });
  }

  // ── SCROLL ANIMATIONS ─────────────────────────────────
  const animEls = document.querySelectorAll(
    '.vehicle-card, .service-card, .dest-card, .price-card, .testi-card, .contact-card, .faq-item, .feature-item, .highlight'
  );
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = (i % 6) * 0.07 + 's';
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  animEls.forEach(el => {
    el.style.opacity  = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // ── COUNTER ANIMATION ─────────────────────────────────
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const text   = el.textContent;
        const num    = parseInt(text.replace(/\D/g, ''));
        const suffix = text.replace(/[0-9]/g, '');
        if (!isNaN(num) && num > 0) {
          let cur = 0;
          const step = Math.ceil(num / 60);
          const timer = setInterval(() => {
            cur += step;
            if (cur >= num) { cur = num; clearInterval(timer); }
            el.textContent = cur + suffix;
          }, 25);
        }
        counterObs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(c => counterObs.observe(c));

  // ── TOAST NOTIFICATION ────────────────────────────────
  function showToast(msg, type = 'success') {
    document.querySelector('.toast-msg')?.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '100px', left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: type === 'error' ? '#ef4444' : '#22c55e',
      color: 'white', padding: '14px 28px', borderRadius: '50px',
      fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem',
      fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      zIndex: '99999', transition: 'all 0.3s ease', opacity: '0', whiteSpace: 'nowrap'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
