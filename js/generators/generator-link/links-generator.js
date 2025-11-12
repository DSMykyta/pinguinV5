// links-generator.js

let countriesData = {}; // Зберігаємо дані про країни

// Функція для ініціалізації блоку "Офіційні сайти"
export function initLinksGenerator() {
    const buttonsContainer = document.getElementById("buttons-container");
    const searchInput = document.getElementById("search-link");
    const countryDisplay = document.getElementById("links-country-name");
    
    if (!buttonsContainer || !searchInput || !countryDisplay) {
        return;
    }

    const csvUrlLinks = 'https://docs.google.com/spreadsheets/d/1kDpQ6FoSsEsA7dc36MKYA97j6lTmLZ_de11o83CZGXU/export?format=csv';

    const updateLinkCountry = () => {
        const brandName = searchInput.value.trim().toLowerCase();
        countryDisplay.textContent = countriesData[brandName] || '';
    };

    Papa.parse(csvUrlLinks, {
        download: true,
        header: true,
        complete: function(results) {
            const data = results.data;
            
            countriesData = data.reduce((acc, row) => {
                const brand = row.BrandName ? row.BrandName.toLowerCase().trim() : '';
                const country = row.CountryName ? row.CountryName.trim() : '';
                if (brand && country) {
                    acc[brand] = country;
                }
                return acc;
            }, {});

            buttonsContainer.innerHTML = '';
            data.forEach(row => {
                if (row.BrandName && row.Link) {
                    const linkElement = document.createElement("a");
                    linkElement.className = "chip chip-link";
                    linkElement.href = row.Link;
                    linkElement.target = "_blank";
                    linkElement.textContent = row.BrandName;
                    linkElement.dataset.brandLower = row.BrandName.toLowerCase();

                    buttonsContainer.appendChild(linkElement);
                }
            });
            
            updateLinkCountry();
        },
        error: function(err) {
            console.error('Помилка завантаження CSV з посиланнями:', err);
        }
    });

    searchInput.addEventListener("input", function () {
        const searchTerm = searchInput.value.toLowerCase();
        const buttons = buttonsContainer.getElementsByClassName("chip");
        for (let i = 0; i < buttons.length; i++) {
            const buttonText = buttons[i].dataset.brandLower || buttons[i].textContent.toLowerCase();
            if (buttonText.includes(searchTerm)) {
                buttons[i].style.display = "";
            } else {
                buttons[i].style.display = "none";
            }
        }
    });

    searchInput.addEventListener('input', updateLinkCountry);
}