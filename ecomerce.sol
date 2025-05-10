// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleEcommerce {
    address public owner;
    uint256 public nextProductId = 1;
    uint256 public nextOrderId = 1;

    constructor() {
        owner = msg.sender;
    }

    enum OrderStatus {
        Pending,    // Initial state when order is placed
        Accepted,   // Seller has accepted the order
        Shipped,    // Order has been shipped
        Delivered,  // Order has been delivered
        Cancelled   // Order has been cancelled
    }

    struct Product {
        uint256 id;
        address seller;
        string name;
        uint256 price;
        bool available;
        uint256 stock;  // Added stock tracking
    }

    struct ShippingInfo {
        string streetAddress;
        string city;
        string state;
        string zipCode;
        string country;
    }

    struct Order {
        uint256 id;
        address buyer;
        uint256[] productIds;
        uint256[] quantities;
        uint256 totalPaid;
        ShippingInfo shippingInfo;
        bool hasShippingInfo;
        OrderStatus status;
        uint256 timestamp;
    }

    mapping(address => bool) public registeredSellers;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    // Mapping to track seller's orders
    mapping(address => uint256[]) public sellerOrders;
    // Mapping to track buyer's orders
    mapping(address => uint256[]) public buyerOrders;

    event SellerRegistered(address indexed seller);
    event ProductAdded(uint256 indexed productId, address indexed seller, string name, uint256 price, uint256 stock);
    event ProductUpdated(uint256 indexed productId, string name, uint256 price, uint256 stock, bool available);
    event OrderPlaced(uint256 indexed orderId, address indexed buyer, uint256 totalPaid);
    event OrderShippingInfoUpdated(uint256 indexed orderId);
    event OrderStatusUpdated(uint256 indexed orderId, OrderStatus status);

    modifier onlySeller() {
        require(registeredSellers[msg.sender], "Not a registered seller");
        _;
    }

    modifier onlyOrderSeller(uint256 orderId) {
        require(products[orders[orderId].productIds[0]].seller == msg.sender, "Not the seller of this order");
        _;
    }

    function registerAsSeller() external {
        require(!registeredSellers[msg.sender], "Already registered");
        registeredSellers[msg.sender] = true;
        emit SellerRegistered(msg.sender);
    }

    function addProduct(string calldata name, uint256 price, uint256 stock) external onlySeller {
        products[nextProductId] = Product(nextProductId, msg.sender, name, price, true, stock);
        emit ProductAdded(nextProductId, msg.sender, name, price, stock);
        nextProductId++;
    }

    function updateProduct(uint256 productId, string calldata name, uint256 price, uint256 stock, bool available) external {
        require(products[productId].seller == msg.sender, "Not your product");
        products[productId].name = name;
        products[productId].price = price;
        products[productId].stock = stock;
        products[productId].available = available;
        emit ProductUpdated(productId, name, price, stock, available);
    }

    function placeOrder(uint256[] calldata productIds, uint256[] calldata quantities) external payable {
        require(productIds.length == quantities.length, "Mismatched inputs");
        require(productIds.length > 0, "Empty order");

        uint256 totalCost;
        uint256[] memory sellerAmounts = new uint256[](productIds.length);
        address[] memory sellers = new address[](productIds.length);
        
        // First loop: validate and calculate costs
        for (uint256 i = 0; i < productIds.length; i++) {
            Product storage p = products[productIds[i]];
            require(p.available, "Product not available");
            require(p.stock >= quantities[i], "Insufficient stock");
            
            uint256 amount = p.price * quantities[i];
            totalCost += amount;
            sellerAmounts[i] = amount;
            sellers[i] = p.seller;
            
            // Update stock immediately
            p.stock -= quantities[i];
        }

        require(msg.value == totalCost, "Incorrect payment");

        // Second loop: transfer funds to sellers
        for (uint256 i = 0; i < productIds.length; i++) {
            payable(sellers[i]).transfer(sellerAmounts[i]);
        }

        // Create order with minimal storage
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            buyer: msg.sender,
            productIds: productIds,
            quantities: quantities,
            totalPaid: msg.value,
            shippingInfo: ShippingInfo({
            streetAddress: "",
            city: "",
            state: "",
            zipCode: "",
            country: ""
            }),
            hasShippingInfo: false,
            status: OrderStatus.Pending,
            timestamp: block.timestamp
        });

        // Update order mappings
        buyerOrders[msg.sender].push(orderId);
        sellerOrders[sellers[0]].push(orderId);

        emit OrderPlaced(orderId, msg.sender, msg.value);
    }

    function addShippingInfoToOrder(
        uint256 orderId,
        string calldata shippingStreetAddress,
        string calldata city,
        string calldata state,
        string calldata zipCode,
        string calldata country
    ) external {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not your order");
        require(!order.hasShippingInfo, "Shipping info already added");
        
        order.shippingInfo = ShippingInfo({
            streetAddress: shippingStreetAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country
        });
        order.hasShippingInfo = true;
        
        emit OrderShippingInfoUpdated(orderId);
    }

    function updateOrderStatus(uint256 orderId, OrderStatus newStatus) external onlyOrderSeller(orderId) {
        Order storage order = orders[orderId];
        require(order.status != OrderStatus.Cancelled, "Order is cancelled");
        require(uint256(newStatus) > uint256(order.status), "Invalid status transition");
        
        order.status = newStatus;
        emit OrderStatusUpdated(orderId, newStatus);
    }

    // View function to get shipping info
    function getShippingInfo(uint256 orderId) external view returns (
        string memory streetAddress,
        string memory city,
        string memory state,
        string memory zipCode,
        string memory country,
        bool hasInfo
    ) {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender || products[order.productIds[0]].seller == msg.sender, "Not authorized");
        
        return (
            order.shippingInfo.streetAddress,
            order.shippingInfo.city,
            order.shippingInfo.state,
            order.shippingInfo.zipCode,
            order.shippingInfo.country,
            order.hasShippingInfo
        );
    }

    // View function to get seller's orders
    function getSellerOrders() external view onlySeller returns (uint256[] memory) {
        return sellerOrders[msg.sender];
    }

    // View function to get buyer's orders
    function getBuyerOrders() external view returns (uint256[] memory) {
        return buyerOrders[msg.sender];
    }

    // View function to get order details
    function getOrderDetails(uint256 orderId) external view returns (
        uint256 id,
        address buyer,
        uint256[] memory productIds,
        uint256[] memory quantities,
        uint256 totalPaid,
        OrderStatus status,
        uint256 timestamp
    ) {
        Order storage order = orders[orderId];
        require(
            order.buyer == msg.sender || 
            products[order.productIds[0]].seller == msg.sender,
            "Not authorized"
        );
        
        return (
            order.id,
            order.buyer,
            order.productIds,
            order.quantities,
            order.totalPaid,
            order.status,
            order.timestamp
        );
    }

    // View function to get product details
    function getProductDetails(uint256 productId) external view returns (
        uint256 id,
        address seller,
        string memory name,
        uint256 price,
        bool available,
        uint256 stock
    ) {
        Product storage product = products[productId];
        return (
            product.id,
            product.seller,
            product.name,
            product.price,
            product.available,
            product.stock
        );
    }

    // Function to get all products
    function getAllProducts() external view returns (Product[] memory) {
        uint256 totalProducts = nextProductId - 1;
        Product[] memory allProducts = new Product[](totalProducts);
        
        for (uint256 i = 1; i < nextProductId; i++) {
            allProducts[i - 1] = products[i];
        }
        
        return allProducts;
    }
}
