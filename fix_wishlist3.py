with open('static/js/product_detail.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# The exact old string from the file (I need to match it precisely)
# From the debug output, the file uses template literals like /wishlist/add/${productId}/
# and has specific whitespace. Let me construct it carefully.

# Read lines around the handler to construct exact old string
lines = open('static/js/product_detail.js', 'r', encoding='utf-8', errors='ignore').readlines()

# Find the start and end lines
# Line 1218 is 'const wishlistBtn ='
# The handler ends after the closing ); of the addEventListener

# Let me just replace using a marker approach
# I'll use a unique marker that I can insert and then replace

# Actually, let me use a different strategy: use sed via a temp file
with open('static/js/product_detail.js', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Find line numbers
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'const wishlistBtn =' in line:
        start_line = iulian<tool_call>
<function=bash>
<parameter=timeout>
120000