function addOrderItem() {
    const cardBody = document.querySelector('.orders_items');

    // Create a new row for order item, quantity, price, and remove button
    const newRow = document.createElement('div');
    newRow.className = 'row mt-3 align-items-center';

    // Create Order Item column
    const itemCol = document.createElement('div');
    itemCol.className = 'col-12 col-sm-6 col-md-3 m-4';
    const itemGroup = document.createElement('div');
    itemGroup.className = 'form-group';
    const itemLabel = document.createElement('label');
    itemLabel.innerText = 'Order Item Product';
    const itemInput = document.createElement('select');
    itemInput.name = 'order_item[]';
    itemInput.className = 'form-control product-select';
    itemInput.placeholder = 'Enter Select product';
    itemGroup.appendChild(itemLabel);
    itemGroup.appendChild(itemInput);
    itemCol.appendChild(itemGroup);

    // Create Quantity column
    const quantityCol = document.createElement('div');
    quantityCol.className = 'col-12 col-sm-6 col-md-3 m-2';
    const quantityGroup = document.createElement('div');
    quantityGroup.className = 'form-group';
    const quantityLabel = document.createElement('label');
    quantityLabel.innerText = 'Quantity';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.name = 'quantity[]';
    quantityInput.className = 'form-control';
    quantityInput.placeholder = 'Enter quantity';
    quantityGroup.appendChild(quantityLabel);
    quantityGroup.appendChild(quantityInput);
    quantityCol.appendChild(quantityGroup);

    // Create Price column
    const priceCol = document.createElement('div');
    priceCol.className = 'col-12 col-sm-6 col-md-3 m-2';
    const priceGroup = document.createElement('div');
    priceGroup.className = 'form-group';
    const priceLabel = document.createElement('label');
    priceLabel.innerText = 'Price';
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.name = 'price[]';
    priceInput.className = 'form-control';
    priceInput.step = '0.01';
    priceInput.placeholder = 'Enter price';
    priceGroup.appendChild(priceLabel);
    priceGroup.appendChild(priceInput);
    priceCol.appendChild(priceGroup);

    // Create Remove Button column
    const removeCol = document.createElement('div');
    removeCol.className = 'col-md-3 d-flex align-items-center';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.innerText = 'Remove';
    removeButton.onclick = function () {
        newRow.remove();
    };
    removeCol.appendChild(removeButton);

    // Append all columns to the new row
    newRow.appendChild(itemCol);
    newRow.appendChild(quantityCol);
    newRow.appendChild(priceCol);
    newRow.appendChild(removeCol);

    // Append the new row to the form body
    cardBody.appendChild(newRow);

    search_product()
}

function search_customer() {
    $('#customer-name').select2({
        placeholder: 'Search Customer.',
        minimumInputLength: 2,
        cache: true,
        ajax: {
            url: searchCustomerUrl,
            dataType: 'json',
            delay: 500,
            data: function (params) {
                return {

                    q: params.term
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            }
        }

    });
}

function search_product() {
    $('.product-select').select2({
        placeholder: 'Please Select  Product',
        minimumInputLength: 2,
        cache: true,
        ajax: {
            url: searchProductUrl,
            dataType: 'json',
            data: function (params) {
                return {
                    q: params.term
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            }
        }
    })
}

$(document).ready(function () {
    search_customer()
    search_product()
});