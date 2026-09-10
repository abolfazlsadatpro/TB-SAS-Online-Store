import re

with open('static/js/product_detail.js', 'r', encoding='utf-8') as f:
    content = f.read()

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
                        );


                        icon.classList.add(
                            "fa-solid"
                        );


                        showWishlistToast();


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
    );
"""

if old in content:
    content = content.replace(old, new)
    with open('static/js/product_detail.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Replacement done')
else:
    print('FAILED: old_text not found in content')
    # Debug: print surrounding context
    idx = content.find('wishlistBtn')
    if idx != -1:
        print('Found wishlistBtn at', idx)
        print(content[idx:idx+600])