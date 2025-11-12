// seo-generator.js

let countriesData = {};
let triggersData = [];

// DOM елементи
const dom = {
    // Вхідні дані з основного контенту
    inputTextMarkup: null,
    brandNameInput: null,
    productNameInput: null,
    productPackagingInput: null,
    
    // Елементи для виводу
    countryNameDiv: null,
    seoTitleInput: null,
    seoTitleCounterSpan: null,
    seoKeywordsInput: null,
    seoKeywordsCounterSpan: null,
    seoDescriptionInput: null,
    seoDescriptionCounterSpan: null,
    
    // Тригери
    triggerTitlesContainer: null,
    trigerButtonsContainer: null,
    searchTrigerInput: null,
    
    // Попередження
    commonWarning: null
};

// Завантаження даних
async function fetchData() {
    const csvUrlTriggers = 'https://docs.google.com/spreadsheets/d/1JFICWpsPnZWOS1HcdUYEP-FLUFw1gf8aDEd47aFcEeo/export?format=csv';
    const csvUrlBrandsCountries = 'https://docs.google.com/spreadsheets/d/1kDpQ6FoSsEsA7dc36MKYA97j6lTmLZ_de11o83CZGXU/export?format=csv';

    try {
        const [triggersResponse, brandsResponse] = await Promise.all([
            fetch(csvUrlTriggers),
            fetch(csvUrlBrandsCountries)
        ]);

        const [triggersCsv, brandsCsv] = await Promise.all([
            triggersResponse.text(),
            brandsResponse.text()
        ]);
        
        // Парсинг брендів та країн
        Papa.parse(brandsCsv, {
            header: true,
            complete: (results) => {
                countriesData = results.data.reduce((acc, row) => {
                    const brand = row.BrandName ? row.BrandName.toLowerCase().trim() : '';
                    const country = row.CountryName ? row.CountryName.trim() : '';
                    if (brand && country) acc[brand] = country;
                    return acc;
                }, {});
                updateCountry();
            }
        });
        
        // Парсинг тригерів
        Papa.parse(triggersCsv, {
            header: true,
            complete: (results) => {
                triggersData = results.data.map(row => ({
                    title: row.TitleUA ? row.TitleUA.trim() : '',
                    triggers: row.Triggers ? row.Triggers.split(',').map(t => t.trim()).filter(Boolean) : [],
                    keywords: row.KeywordsRU ? row.KeywordsRU.split(',').map(k => k.trim()).filter(Boolean) : []
                })).filter(t => t.title && (t.triggers.length > 0 || t.keywords.length > 0));
                renderTriggerButtons();
            }
        });

    } catch (error) {
        console.error("Error fetching CSV data:", error);
    }
}

// Функції генерації
function generateSeoTitle() {
    const brandName = dom.brandNameInput.value.trim();
    const productName = dom.productNameInput.value.trim();
    const packaging = dom.productPackagingInput.value.trim();
    const seoTitle = `Купить ${brandName} ${productName}${packaging ? ' ' + packaging : ''} в Украине. Низкие цены!`;
    dom.seoTitleInput.value = seoTitle;
    dom.seoTitleCounterSpan.innerText = `${seoTitle.length}/65`;
}

function generateSeoDescription() {
    const text = (dom.inputTextMarkup.value || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const firstSentence = text.match(/[^\.!\?]+[\.!\?]+/g)?.[0] || text;
    const phoneNumbers = ["(096)519-78-22", "(073)475-67-07", "(099)237-90-38"];
    const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    const seoDescription = `${firstSentence} Для заказа звоните по номеру: ${randomPhone}`;
    dom.seoDescriptionInput.value = seoDescription;
    dom.seoDescriptionCounterSpan.innerText = `${seoDescription.length}/200`;
}

function generateSeoKeywords() {
    const brandName = dom.brandNameInput.value.trim();
    const productName = dom.productNameInput.value.trim();
    const packaging = dom.productPackagingInput.value.trim();

    let baseKeywords = [
        `купить ${brandName} ${productName}${packaging ? ' ' + packaging : ''}`,
        `${brandName} ${productName}`,
        `${brandName}`,
        `${productName}`
    ].filter(Boolean);

    let triggerKeywords = [];
    const activeTulips = dom.triggerTitlesContainer.querySelectorAll('.chip-active');
    activeTulips.forEach(tulip => {
        const title = tulip.dataset.title;
        const trigger = triggersData.find(t => t.title === title);
        if (trigger) {
            triggerKeywords.push(...trigger.keywords);
        }
    });

    const allKeywords = [...new Set([...baseKeywords, ...triggerKeywords])];
    const seoKeywords = allKeywords.join(', ');
    dom.seoKeywordsInput.value = seoKeywords;
    dom.seoKeywordsCounterSpan.innerText = `${seoKeywords.length}/250`;
}

// Функції оновлення UI
function updateBrandAndProductName() {
    const text = (dom.inputTextMarkup.value || '').replace(/<\/?[^>]+(>|$)/g, '');
    const words = text.split(/\s+/);
    dom.brandNameInput.value = words[0] || '';
    
    const dashIndex = words.findIndex(word => word === '-' || word === '–');
    dom.productNameInput.value = (dashIndex !== -1 ? words.slice(1, dashIndex) : words.slice(1)).join(' ');

    runAllUpdates();
}

function updateCountry() {
    const brandName = dom.brandNameInput.value.trim().toLowerCase();
    dom.countryNameDiv.innerText = countriesData[brandName] || '';
}

function updateTriggerTulips() {
    const productName = dom.productNameInput.value.toLowerCase();
    const activeTitles = new Set();
    
    // Зберігаємо існуючі активні тюльпани, додані вручну
    dom.triggerTitlesContainer.querySelectorAll('.chip-active').forEach(tulip => {
        activeTitles.add(tulip.dataset.title);
    });

    // Додаємо тюльпани, що відповідають назві продукту
    triggersData.forEach(trigger => {
        if (trigger.triggers.some(t => productName.includes(t.toLowerCase()))) {
            activeTitles.add(trigger.title);
        }
    });

    dom.triggerTitlesContainer.innerHTML = '';
    activeTitles.forEach(title => {
        const trigger = triggersData.find(t => t.title === title);
        if (trigger) {
            addTulipToContainer(trigger, true);
        }
    });
    generateSeoKeywords();
}

function addTulipToContainer(trigger, isActive = true) {
    if (!trigger || !trigger.title) return;
    // Перевірка, чи тюльпан вже існує
    if (dom.triggerTitlesContainer.querySelector(`[data-title="${trigger.title}"]`)) {
        return;
    }

    const tulip = document.createElement('div');
    tulip.className = isActive ? 'chip chip-active chip-tooltip' : 'chip chip-tooltip';
    tulip.textContent = trigger.title;
    tulip.dataset.title = trigger.title;

    const tooltip = document.createElement('div');
    tooltip.className = 'chip-tooltip-content';
    tooltip.textContent = trigger.keywords.join(', ');
    tulip.appendChild(tooltip);

    tulip.addEventListener('click', () => {
        tulip.classList.toggle('chip-active');
        generateSeoKeywords();
    });

    dom.triggerTitlesContainer.appendChild(tulip);
}

function renderTriggerButtons() {
    if (!dom.trigerButtonsContainer) return;
    dom.trigerButtonsContainer.innerHTML = '';
    triggersData.forEach(trigger => {
        const button = document.createElement('button');
        button.className = 'chip chip-clickable';
        button.textContent = trigger.title;
        button.addEventListener('click', () => {
            addTulipToContainer(trigger, true);
            generateSeoKeywords();
        });
        dom.trigerButtonsContainer.appendChild(button);
    });
}

// Система безпеки
function checkSafety() {
    const BANNED_BRANDS = ['clomapharm', 'cloma pharm'];
    const BANNED_PRODUCTS = ['alpha gpc', 'aloe-emodin', 'aloin', 'barbaloin', 'hydroxyanthracene', 'anthraquinone', 'dantron', 'danthron', 'emodin', 'ephedra', 'ma huang', 'ephedrine', 'pseudoephedrine', 'norephedrine', 'phenylpropanolamine', 'yohimbe', 'yohimbine', 'rauwolscine', 'quebrachine', 'dmaa', '1,3-dimethylamylamine', 'methylhexanamine', 'geranamine', 'dmha'];
    const brandValue = dom.brandNameInput.value.toLowerCase();
    const productValue = dom.productNameInput.value.toLowerCase();
    const isBanned = BANNED_BRANDS.some(b => brandValue.includes(b)) || BANNED_PRODUCTS.some(p => productValue.includes(p));
    dom.commonWarning.textContent = isBanned ? 'Заборонено до продажу в Україні' : '';
}

// Загальна функція оновлення
function runAllUpdates() {
    updateCountry();
    updateTriggerTulips();
    generateSeoTitle();
    generateSeoDescription();
    generateSeoKeywords(); // Ця функція має йти після updateTriggerTulips
    checkSafety();
}

// Ініціалізація
export function initSeoGenerator() {
    // Прив'язка DOM елементів
    dom.inputTextMarkup = document.getElementById('input-text-markup');
    dom.brandNameInput = document.getElementById('brand-name');
    dom.productNameInput = document.getElementById('product-name');
    dom.productPackagingInput = document.getElementById('product-packaging');
    dom.countryNameDiv = document.getElementById('country-name');
    dom.seoTitleInput = document.getElementById('seo-title');
    dom.seoTitleCounterSpan = document.getElementById('seo-title-counter');
    dom.seoKeywordsInput = document.getElementById('seo-keywords');
    dom.seoKeywordsCounterSpan = document.getElementById('seo-keywords-counter');
    dom.seoDescriptionInput = document.getElementById('seo-description');
    dom.seoDescriptionCounterSpan = document.getElementById('seo-description-counter');
    dom.triggerTitlesContainer = document.getElementById('trigger-titles-container');
    dom.trigerButtonsContainer = document.getElementById('triger-buttons-container');
    dom.searchTrigerInput = document.getElementById('search-triger');
    dom.commonWarning = document.getElementById('common-warning');

    if (!dom.brandNameInput) return; // Якщо на сторінці немає цього блоку, нічого не робити

    fetchData();

    // Слухачі подій
    dom.inputTextMarkup.addEventListener('input', updateBrandAndProductName);
    ['brandNameInput', 'productNameInput', 'productPackagingInput'].forEach(key => {
        dom[key].addEventListener('input', runAllUpdates);
    });
    
    dom.searchTrigerInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        dom.trigerButtonsContainer.querySelectorAll('.chip').forEach(button => {
            button.style.display = button.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
    });

    // Копіювання по кліку
    [dom.seoTitleInput, dom.seoKeywordsInput, dom.seoDescriptionInput].forEach(input => {
        input.addEventListener('click', () => {
            navigator.clipboard.writeText(input.value).then(() => {
                // Можна додати візуальний фідбек
            });
        });
    });

    // Перший запуск
    runAllUpdates();
}