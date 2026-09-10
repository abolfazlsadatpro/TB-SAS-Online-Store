$proposals = @(1, 2, 3, 4, 5)
foreach ($id in $proposals) {
    $content = curl.exe -s "http://127.0.0.1:8001/proposal-$id.html"
    $hasGallery = [bool]($content -match 'mainimage')
    $hasColors = [bool]($content -match 'colorpicker')
    $hasQty = [bool]($content -match 'qty-minus')
    $hasAddCart = [bool]($content -match 'addtocart')
    $hasWishlist = [bool]($content -match 'wishlist')
    $hasTabs = [bool]($content -match 'pdl-p' + $id + '-tab"' -or $content -match 'tabs" data-pdl-tabs')
    $hasShowMore = [bool]($content -match 'showmore')
    $hasReviews = [bool]($content -match 'pdl-p' + $id + '-review' -or $content -match 'pdl-p' + $id + '-reviews')
    $hasRelated = [bool]($content -match 'related-grid')
    Write-Host ("P{0}: gallery={1} colors={2} qty={3} addcart={4} wishlist={5} tabs={6} showmore={7} reviews={8} related={9}" -f $id, $hasGallery, $hasColors, $hasQty, $hasAddCart, $hasWishlist, $hasTabs, $hasShowMore, $hasReviews, $hasRelated)
}