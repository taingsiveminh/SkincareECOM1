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
            // image clicks open single-image view; title opens full product page
            const html = `
            <div class="new-product-box-wrapper ${cls}">
              <div class="new-product-box">
                <a href="product_page.html?id=${p.id}&single=1" class="new-product-img">
                  <span>${p.category}</span>
                  <img src="${p.image}" alt="${escapeHtml(p.title)}" />
                </a>
                <div class="new-product-text">
                  <a href="product_page.html?id=${p.id}" class="new-product-title">${escapeHtml(p.title)}</a>
                  <span>$${p.price.toFixed(2)}</span>
                  <a href="#" class="new-p-cart-btn" data-id="${p.id}">Add To Cart</a>
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

        // --- Cart: add-to-cart, panel, persistence and rendering ---
        function ensureCartPanel(){
            if($('#cart-panel').length) return;
            const panel = $(`
              <div id="cart-panel" class="cart-panel hidden" role="dialog" aria-label="Shopping cart" aria-hidden="true">
                <div class="cart-header"><strong>Your Cart</strong><button id="cart-close" aria-label="Close">&times;</button></div>
                <div id="cart-items"></div>
                <div class="cart-footer"><div class="cart-total">Total: $<span id="cart-total">0.00</span></div><button id="checkout-btn">Checkout</button></div>
              </div>
            `);
            const backdrop = $(`<div id="cart-backdrop" class="cart-backdrop hidden" tabindex="-1" aria-hidden="true"></div>`);
            $('body').append(panel).append(backdrop);
            // close handlers
            $('#cart-backdrop').on('click', closeCart);
            $('body').on('click', '#cart-close', closeCart);
        }

        function openCart(){ ensureCartPanel(); $('#cart-panel').removeClass('hidden'); $('#cart-backdrop').removeClass('hidden'); $('.nav-cart').attr('aria-expanded','true'); renderCart(); updateCartCount(); }
        function closeCart(){ $('#cart-panel').addClass('hidden'); $('#cart-backdrop').addClass('hidden'); $('.nav-cart').attr('aria-expanded','false'); }

        function updateCartCount(){ const cart = getCart(); const total = cart.reduce((s,i)=>s+(i.qty||0),0); const $b = $('.cart-count'); if(!$b.length) return; if(total>0){ $b.text(total).removeAttr('hidden'); } else { $b.attr('hidden',''); } }

        function getCart(){ try{ return JSON.parse(localStorage.getItem('bc_cart')||'[]'); }catch(e){ return []; } }
        function saveCart(cart){ localStorage.setItem('bc_cart', JSON.stringify(cart)); renderCart(); updateCartCount(); }

        function renderCart(){
            ensureCartPanel();
            const cart = getCart();
            const $items = $('#cart-items');
            $items.empty();
            if(!cart.length){ $items.html('<div class="cart-empty">Your cart is empty</div>'); $('#cart-total').text('0.00'); updateCartCount(); return; }
            cart.forEach(function(item){
                const subtotal = (item.price * item.qty).toFixed(2);
                const $row = $(`
                 <div class="cart-item" data-id="${item.id}">
                   <img src="${item.image}" alt="${escapeHtml(item.title)}" class="cart-thumb"/>
                   <div class="cart-item-info">
                     <div class="cart-item-title">${escapeHtml(item.title)}</div>
                     <div class="cart-item-meta">$${item.price.toFixed(2)} &times; <input type="number" min="1" class="cart-qty" value="${item.qty}" /></div>
                   </div>
                   <div class="cart-item-sub">$${subtotal}</div>
                   <button class="cart-remove" aria-label="Remove item">&times;</button>
                 </div>
                `);
                $items.append($row);
            });
            const total = cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2);
            $('#cart-total').text(total);
            updateCartCount();
        }

        // Add to cart button (delegated)
        $container.on('click', '.new-p-cart-btn', function(e){
            e.preventDefault();
            const id = $(this).attr('data-id');
            addToCartById(id);
        });

        // Toggle cart panel
        $('.nav-cart').on('click', function(e){
            e.preventDefault();
            ensureCartPanel();
            if($('#cart-panel').hasClass('hidden')) openCart(); else closeCart();
        });

        // Cart events (remove, qty change, close)
        $('body').on('click', '#cart-panel #cart-close', function(){ $('#cart-panel').addClass('hidden'); $('#cart-backdrop').addClass('hidden'); });
        $('body').on('click', '.cart-remove', function(){
            const id = $(this).closest('.cart-item').attr('data-id');
            let cart = getCart();
            cart = cart.filter(i=>i.id!==id);
            saveCart(cart);
        });
        $('body').on('change', '.cart-qty', function(){
            const id = $(this).closest('.cart-item').attr('data-id');
            let cart = getCart();
            const val = Math.max(1, parseInt($(this).val())||1);
            cart = cart.map(i=> i.id===id ? Object.assign({}, i, {qty: val}) : i);
            saveCart(cart);
        });

        function addToCartById(id){
            const prod = products.find(p=>p.id===id);
            if(!prod) return alert('Product not found');
            let cart = getCart();
            const existing = cart.find(i=>i.id===id);
            if(existing){
                existing.qty += 1;
            } else {
                cart.push({id: prod.id, title: prod.title, price: prod.price, image: prod.image, qty:1});
            }
            saveCart(cart);
            flashMessage('Added to cart');
            openCart();
        }

        function flashMessage(msg){
            const $m = $('<div class="flash-msg">'+msg+'</div>');
            $('body').append($m);
            setTimeout(()=> $m.addClass('visible'),10);
            setTimeout(()=> $m.removeClass('visible'),2000);
            setTimeout(()=> $m.remove(),2400);
        }

    });
});

function escapeHtml(text){
    return text.replace(/[&<>"]/g, function(ch){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch];
    });
}
