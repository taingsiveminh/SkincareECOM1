// app.js - renders categories and products from data/products.json

$(document).ready(function(){
    // Load product data
    function loadProductData(callback){
    // try AJAX first (works when served via http)
    $.getJSON('data/products.json', function(data){
        callback(data);
    }).fail(function(){
        // fallback: read embedded JSON (works for file://)
        try{
            const el = document.getElementById('products-data');
            if(el && el.textContent.trim().length){
                const data = JSON.parse(el.textContent);
                callback(data);
                return;
            }
        }catch(e){
            console.error('Fallback parsing failed', e);
        }
        console.error('Failed to load products.json and no embedded data found');
    });
}

// Load product data (supports both http server and file://)
loadProductData(function(data){
        const categories = data.categories;
        const products = data.products;

        // Render categories
        const $catList = $('#category-list');
        // render category chips (no counts)
        $catList.append(`<li class="filter-list active" data-filter="all" role="tab" aria-selected="true"><span class="dot"></span>All</li>`);
        categories.forEach(function(cat){
            const id = cat.toLowerCase().replace(/[^a-z0-9]/g,'-');
            $catList.append(`<li class="filter-list" data-filter="${id}" role="tab" aria-selected="false"><span class="dot"></span>${cat}</li>`);
        });

        // Render products (initially show all)
        const $container = $('.new-product-container');
        products.forEach(function(p){
            const cls = p.category.toLowerCase().replace(/[^a-z0-9]/g,'-');
            const html = `
            <div class="new-product-box-wrapper ${cls}">
              <div class="new-product-box">
                <a href="product_page.html?id=${p.id}" class="new-product-img">
                  <span>${p.category}</span>
                  <img src="${p.image}" alt="${escapeHtml(p.title)}" />
                </a>
                <div class="new-product-text">
                  <a href="product_page.html?id=${p.id}" class="new-product-title">${escapeHtml(p.title)}</a>
                  <span>$${p.price.toFixed(2)}</span>
                  <a href="#" class="new-p-cart-btn">Add To Cart</a>
                </div>
              </div>
            </div>`;
            $container.append(html);
        });

        // Click handlers for category filtering
        $('.filter-list').on('click', function(){
            $('.filter-list').removeClass('active').attr('aria-selected','false');
            $(this).addClass('active').attr('aria-selected','true');
            const value = $(this).attr('data-filter');
            if(value === 'all'){
                $('.new-product-box-wrapper').show(200);
            } else {
                $('.new-product-box-wrapper').hide(200);
                $('.new-product-box-wrapper.'+value).show(200);
            }
        });

    });
});

function escapeHtml(text){
    return text.replace(/[&<>"]/g, function(ch){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch];
    });
}
