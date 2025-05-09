// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EcommerceWithMon {
    address public immutable owner;

    // Product structure - simplified
    struct Product {
        string name;
        uint256 price;
        uint256 stock;
        bool isActive;
        address seller;
    }

    // User structure for seller
    struct User {
        uint256 userId;
        string username;
        address walletAddress;
        bool isRegistered;
        uint256[] productIds;  // Track seller's products
    }

    Product[] public products;
    
    // Mappings
    mapping(address => User) public sellers;  // Only for registered sellers
    mapping(uint256 => address) public userIdToAddress;

    // Events
    event ProductAdded(uint256 indexed productId, string name, uint256 price, uint256 stock, address seller);
    event ProductUpdated(uint256 indexed productId, string name, uint256 price, uint256 stock);
    event ProductDeactivated(uint256 indexed productId);
    event SellerRegistered(address indexed wallet, uint256 userId, string username);
    event ProductPurchased(address indexed buyer, uint256 indexed productId, uint256 quantity, uint256 amount);

    // Custom errors
    error NotOwner();
    error AlreadyRegistered();
    error UserIdTaken();
    error NotRegisteredSeller();
    error InvalidProductId();
    error InsufficientStock();
    error IncorrectPayment();
    error ProductNotActive();
    error InvalidQuantity();
    error NotProductOwner();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRegisteredSeller() {
        if (!sellers[msg.sender].isRegistered) revert NotRegisteredSeller();
        _;
    }

    // Seller Registration
    function registerSeller(uint256 userId, string calldata username) external {
        if (sellers[msg.sender].isRegistered) revert AlreadyRegistered();
        if (userIdToAddress[userId] != address(0)) revert UserIdTaken();

        sellers[msg.sender] = User({
            userId: userId,
            username: username,
            walletAddress: msg.sender,
            isRegistered: true,
            productIds: new uint256[](0)
        });
        userIdToAddress[userId] = msg.sender;

        emit SellerRegistered(msg.sender, userId, username);
    }

    // Product Management
    function addProduct(
        string memory name,
        uint256 price,
        uint256 stock
    ) external onlyRegisteredSeller {
        uint256 productId = products.length;
        products.push(Product({
            name: name,
            price: price,
            stock: stock,
            isActive: true,
            seller: msg.sender
        }));

        sellers[msg.sender].productIds.push(productId);
        emit ProductAdded(productId, name, price, stock, msg.sender);
    }

    function updateProduct(
        uint256 productId,
        string memory name,
        uint256 price,
        uint256 stock
    ) external onlyRegisteredSeller {
        if (productId >= products.length) revert InvalidProductId();
        if (products[productId].seller != msg.sender) revert NotProductOwner();

        Product storage product = products[productId];
        product.name = name;
        product.price = price;
        product.stock = stock;

        emit ProductUpdated(productId, name, price, stock);
    }

    function deactivateProduct(uint256 productId) external onlyRegisteredSeller {
        if (productId >= products.length) revert InvalidProductId();
        if (products[productId].seller != msg.sender) revert NotProductOwner();
        
        products[productId].isActive = false;
        emit ProductDeactivated(productId);
    }

    // Purchase function - simplified for direct purchase
    function purchaseProduct(uint256 productId, uint256 quantity) external payable {
        if (productId >= products.length) revert InvalidProductId();
        if (!products[productId].isActive) revert ProductNotActive();
        if (quantity == 0) revert InvalidQuantity();
        if (products[productId].stock < quantity) revert InsufficientStock();

        uint256 totalAmount = products[productId].price * quantity;
        if (msg.value != totalAmount) revert IncorrectPayment();

        // Update stock
        products[productId].stock -= quantity;
        
        // Transfer payment to seller
        address seller = products[productId].seller;
        (bool success, ) = seller.call{value: totalAmount}("");
        require(success, "Transfer to seller failed");

        emit ProductPurchased(msg.sender, productId, quantity, totalAmount);
    }

    // View functions
    function getProductDetails(uint256 productId) external view returns (
        string memory name,
        uint256 price,
        uint256 stock,
        bool isActive,
        address seller
    ) {
        if (productId >= products.length) revert InvalidProductId();
        Product storage product = products[productId];
        return (
            product.name,
            product.price,
            product.stock,
            product.isActive,
            product.seller
        );
    }

    function getSellerProducts(address seller) external view returns (uint256[] memory) {
        return sellers[seller].productIds;
    }
}
