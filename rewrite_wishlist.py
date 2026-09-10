#!/usr/bin/env python3
import sys
import os

# Read the file
with open('static/js/product_detail.js', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# The exact old string - I need to match what's in the file
# From previous debug, the file has:
# - template literals with backticks for the fetch URL
# - specific quote styles

# Let me construct the old string using the exact characters from the file
# I'll read specific bytes to construct it

# Find the position of 'const wishlistBtn ='
pos = content.find('const wishlistBtn =')
if pos == -1:
    print('Could not find const wishlistBtn =')
    sys.exit(1)

# Find the end of the handler - look for the pattern that ends it
# The handler ends with }); etc. Let me find a distinctive marker
# Look for 'showWishlistToast' which is the last function call in the handler
pos_show = content.find('showWishlistToast')
if pos_show == -1:
    print('Could not find showWishlistToast')
    sys.exit(1)

# The old string goes from 'const wishlistBtn =' to after the closing });
# Let me find the closing }); position
# Search for the pattern that closes the addEventListener
close_pos = content.find('});', pos_show)
if close_pos == -1:
    print('Could not find closing });')
    sys.exit(1)

# The old string extends from 'const wishlistBtn =' to after the closing });
old = content[pos:close_pos + 3]  # Include the closing );

print('Old string length:', len(old))
print('Old string preview:', old[:100])

# The new string - the wishlist button now uses pdpQuantity and addToCartServer
new = '''const wishlistBtn =
    document.querySelector(".wishlist-btn");

if(wishlistBtn){

    wishlistBtn.addEventListener(
        "click",
        function(){
            // Use the shared pdpQuantity state and addToCartServer
            // instead of the wishlist /wishlist/add/ endpoint
            addToCartServer(wishlistBtn, pdpQuantity);
        }
    );
}'''

if old in content:
    new_content = content.replace(old, new)
    with open('static/js/product_detail.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS: Replacement done')
    print('Old length:', len(old))
    print('New length:', len(new))
else:
    print('FAILED: old string not found in content')
    # Debug: show where wishlistBtn appears
    pos = content.find('wishlistBtn')
    print('wishlistBtn found at', pos)
    print('Content around there:')
    print(content[pos:pos+500])
PYEOF