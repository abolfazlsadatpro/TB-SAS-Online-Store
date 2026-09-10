$products = @(8, 9, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30)
foreach ($id in $products) {
    $code = curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:8000/product_detail/$id/"
    Write-Host ("Product {0}: {1}" -f $id, $code)
}