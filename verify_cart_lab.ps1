$versions = @("v1", "v2", "v3")
foreach ($v in $versions) {
    $content = curl.exe -s "http://127.0.0.1:8002/$v/index.html"
    $hasCartItems = [bool]($content -match 'id="' + $v + '-items"')
    $hasSummary = [bool]($content -match 'class="pcl-' + $v + '-summary"')
    $hasCoupon = [bool]($content -match 'id="' + $v + '-coupon-input"')
    $hasCheckout = [bool]($content -match 'class="pcl-' + $v + '-summary"')
    $hasEmptyState = [bool]($content -match 'cart-empty|empty|pcl-' + $v + '-empty')
    $hasDataLink = [bool]($content -match 'shared/data.js')
    $hasJsLink = [bool]($content -match 'cart.js')
    $hasLabBar = [bool]($content -match 'pcl-lab-bar')
    Write-Host ("$v : items=$hasCartItems summary=$hasSummary coupon=$hasCoupon checkout=$hasCheckout empty=$hasEmptyState data=$hasDataLink js=$hasJsLink labbar=$hasLabBar")
}