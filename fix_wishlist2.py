with open('static/js/product_detail.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Exact old string matching the file content (using template literals)
old = """const wishlistBtn =
    document.querySelector(".wishlist-btn");

if(wishlistBtn){

    wishlistBtn.addEventListener(
        "click",
        function(){
            const productId =
                this.dataset.id;

            const icon =
                this.querySelector("i");


            fetch(
                "/wishlist/add/" + productId,
                {
                    method:"POST",

                    headers:{
                        "X-CSRFToken":
                            getCookie("csrftoken"),
                    }
                }
            )

            .then(response => response.json())

            .then(data => {


                if(data.success){



                    const count =
                        document.getElementById(
                            "wishlistCount"
                        );


                    if(count){

                        count.innerText =
                            data.total;


                    }


                    if(data.action === "added"){



                        icon.classList.remove(
                            "fa-regular"


                        icon.classList.add(
                            "fa-solid"


                        );


                    }else{



                        icon.classList.remove(
                            "fa-solid"


                        icon.classList.add(
                            "fa-regular"


                        );


                    }


                }


            });


        }
    );
}
"""

new = """const wishlistBtn =
    document.querySelector(".wishlist-btn");

if(wishlistBtn){

    wishlistBtn.addEventListener(
        "click",
        function(){
            // Use the shared pdpQuantity state and addToCartServer
            // instead of the wishlist /wishlist/add/ endpoint
            addToCartServer(wishlistBtn, pdpQuantity);
        }
    };
"""

if old in content:
    content = content.replace(old, new)
    with open('static/js/product_detail.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Replacement done')
else:
    print('FAILED: old not found')
    # Debug: print a snippet
    idx = content.find('wishlistBtn')
    print('Found at', idx)
    # Print first 500 chars of the old area
    print(content[idx:idx+600])