// Function to get all products
function getAllProducts() external view returns (Product[] memory) {
    uint256 totalProducts = nextProductId - 1;
    Product[] memory allProducts = new Product[](totalProducts);
    
    for (uint256 i = 1; i < nextProductId; i++) {
        allProducts[i - 1] = products[i];
    }
    
    return allProducts;
} 