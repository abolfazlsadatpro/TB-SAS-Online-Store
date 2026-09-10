// ============================================================
// SHARED HEADER — injected into each proposal so navigation and
// the site header stay consistent across all 5 proposals.
// Reads <body data-proposal="N"> to highlight the current one.
// ============================================================

(function () {
    'use strict';

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }

    function build() {
        var current = document.body.getAttribute('data-proposal') || '';

        var links = [
            { n: '1', label: 'Proposal 1 · Conservative', file: 'proposal-1.html' },
            { n: '2', label: 'Proposal 2 · Modern', file: 'proposal-2.html' },
            { n: '3', label: 'Proposal 3 · Premium', file: 'proposal-3.html' },
            { n: '4', label: 'Proposal 4 · Original', file: 'proposal-4.html' },
            { n: '5', label: 'Proposal 5 · Editorial', file: 'proposal-5.html' }
        ];

        // Switcher bar
        var sw = el('div', 'lab-switcher');
        sw.innerHTML = '<span style="opacity:.8">Products Page \u2014 Design Lab</span>';
        var toIndex = el('a', '', 'All proposals');
        toIndex.href = 'index.html';
        sw.appendChild(toIndex);
        links.forEach(function (l) {
            var a = el('a', l.n === current ? 'current' : '', l.label);
            a.href = l.file;
            sw.appendChild(a);
        });
        document.body.insertBefore(sw, document.body.firstChild);

        // Site header
        var header = el('header', 'lab-header');
        header.innerHTML =
            '<div class="lab-header__top">' +
                '<a class="lab-logo" href="index.html"><span class="dot"></span>TBSAS</a>' +
                '<div class="lab-search"><i class="fa-solid fa-magnifying-glass"></i>' +
                    '<input type="text" placeholder="Search products\u2026" value="iphone">' +
                '</div>' +
                '<div class="lab-header__actions">' +
                    '<div class="lab-auth"><span>Login</span><span class="divider">|</span><span>Register</span></div>' +
                    '<div class="lab-cart"><i class="fa-solid fa-cart-shopping"></i><span>Cart</span>' +
                        '<span class="lab-cart__badge">0</span></div>' +
                '</div>' +
            '</div>' +
            '<div class="lab-catbar"><div class="lab-catbar__inner">' +
                '<div class="lab-mega-btn"><i class="fa-solid fa-bars"></i> Product Categories</div>' +
                '<nav class="lab-catnav">' +
                    '<a class="active" href="#">Mobile Phones</a>' +
                    '<a href="#">Laptops</a>' +
                    '<a href="#">Audio</a>' +
                    '<a href="#">Accessories</a>' +
                '</nav>' +
            '</div></div>';

        var container = document.querySelector('.lab-container') || document.body;
        container.parentNode.insertBefore(header, container);
        // Move switcher above header
        if (header.previousElementSibling !== sw && sw.parentNode) {
            header.parentNode.insertBefore(sw, header);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();