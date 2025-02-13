const cryptoConfig = {
    bitcoin: { color: '#f7931a', trend: 0 },
    ethereum: { color: '#627eea', trend: 0 },
    cardano: { color: '#3468d1', trend: 0 },
    solana: { color: '#14f195', trend: 0 }
};

let chart;
let allDatasets = {};

function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Time labels will accumulate (starting from page load)
            datasets: [] // Datasets for each coin will be added dynamically
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}

async function fetchAllPrices() {
    // Fetch prices for all supported coins regardless of button state
    const coins = Object.keys(cryptoConfig);

    const prices = await Promise.all(
        coins.map(async coin => {
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}`);
                const data = await res.json();
                return {
                    coin,
                    price: data.market_data.current_price.usd,
                    change: data.market_data.price_change_percentage_24h
                };
            } catch (error) {
                console.error(`Error fetching ${coin}:`, error);
                return null;
            }
        })
    );

    return prices.filter(p => p !== null);
}

function updateDatasets(prices) {
    const now = new Date().toLocaleTimeString();

    // Append a new time label (do not remove previous times)
    chart.data.labels.push(now);

    prices.forEach(({ coin, price, change }) => {
        // If the dataset for this coin does not exist, create it and add to the chart
        if (!allDatasets[coin]) {
            const newDataset = {
                label: coin,
                data: [],
                borderColor: cryptoConfig[coin].color,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                hidden: !document.querySelector(`.coin-btn[data-coin="${coin}"]`).classList.contains('active')
            };
            allDatasets[coin] = newDataset;
            chart.data.datasets.push(newDataset);
        }

        // Append the new price data (the historical data remains intact)
        allDatasets[coin].data.push(price);
        cryptoConfig[coin].trend = change;
    });

    chart.update();

    // Animate the chart update with Anime.js
    anime({
        targets: chart.canvas,
        opacity: [0.9, 1],
        duration: 800,
        easing: 'easeInOutQuad'
    });
}

function updatePriceCards(prices) {
    prices.forEach(({ coin, price, change }) => {
        const card = document.querySelector(`.${coin}`);
        if (!card) return;

        card.querySelector('.price').textContent = price.toFixed(2);
        const trendElem = card.querySelector('.trend');
        trendElem.textContent = `${change.toFixed(2)}%`;
        trendElem.style.color = change >= 0 ? '#4caf50' : '#f44336';

        // Animate the trend update
        anime({
            targets: trendElem,
            translateY: [-10, 0],
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutExpo'
        });
    });
}

// Toggle coin button – only changes the chart display (hiding or showing the dataset)
document.querySelectorAll('.coin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const coin = btn.dataset.coin;
        if (allDatasets[coin]) {
            // Update the dataset's hidden property based on the button's active state
            allDatasets[coin].hidden = !btn.classList.contains('active');
            chart.update();
        }
    });
});

// Initialize the chart and begin updating every 5 seconds
initChart();
setInterval(async () => {
    const prices = await fetchAllPrices();
    updateDatasets(prices);
    updatePriceCards(prices);
}, 5000);
