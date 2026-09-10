$products = @(8, 9, 21, 30)
foreach ($id in $products) {
    $content = Get-Content "product_$id.html" -Raw
    $idx = $content.IndexOf('<section class="details-section">')
    if ($idx -ge 0) {
        $snippet = $content.Substring($idx, 200)
        if ($snippet -match '<div class="container">') {
            Write-Host ("P{0}: Container structure OK" -f $id)
        } else {
            Write-Host ("P{0}: Container structure MISSING" -f $id)
        }
    }
}