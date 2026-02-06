graph TB

    subgraph Client["🖥️ Client Layer"]

        Web["Web Browser<br/>React App"]

        Mobile["Mobile App<br/>React Native"]

    end

    subgraph API["🔗 API Gateway & Load Balancer"]

        Gateway["API Gateway<br/>Route & Auth"]

        LB["Load Balancer"]

    end

    subgraph Backend["⚙️ Backend Services"]

        AuthService["Auth Service<br/>JWT Tokens<br/>User Sessions"]

        EventService["Event Service<br/>CRUD Operations<br/>Event Management"]

        AssignmentService["Assignment Service<br/>Code Generation<br/>Distribution Logic"]

        GiftService["Gift Service<br/>Wishlist Management<br/>Image Storage"]

        NotificationService["Notification Service<br/>Email/SMS<br/>Push Notifications"]

    end

    subgraph Data["💾 Data Layer"]

        UserDB["User Database<br/>PostgreSQL"]

        EventDB["Event Database<br/>PostgreSQL"]

        CodeCache["Code Cache<br/>Redis"]

        SessionStore["Session Store<br/>Redis"]

    end

    subgraph Storage["📁 Storage Services"]

        S3["Object Storage<br/>AWS S3/GCS<br/>Gift Images"]

        EmailQueue["Message Queue<br/>RabbitMQ/SQS<br/>Email Jobs"]

    end

    subgraph Security["🔒 Security & Monitoring"]

        Encryption["Encryption Service<br/>AES-256<br/>Code Hashing"]

        Logging["Logging Service<br/>ELK Stack"]

        Monitoring["Monitoring<br/>Prometheus/Grafana"]

        RateLimit["Rate Limiter<br/>DDoS Protection"]

    end

    Client -->|HTTP/HTTPS| Gateway

    Gateway --> LB

    LB -->|Routes Requests| AuthService

    LB -->|Routes Requests| EventService

    LB -->|Routes Requests| AssignmentService

    LB -->|Routes Requests| GiftService

    LB -->|Routes Requests| NotificationService

    AuthService -->|Read/Write| UserDB

    AuthService -->|Store Sessions| SessionStore

    EventService -->|Read/Write| EventDB

    EventService -->|Validates| AuthService

    AssignmentService -->|Cache Codes| CodeCache

    AssignmentService -->|Reads Events| EventDB

    AssignmentService -->|Encrypts Data| Encryption

    GiftService -->|Upload/Fetch| S3

    GiftService -->|Read/Write| EventDB

    NotificationService -->|Queue Jobs| EmailQueue

    AuthService -->|Log Events| Logging

    EventService -->|Log Events| Logging

    AssignmentService -->|Log Events| Logging

    Gateway -->|Check Limits| RateLimit

    Gateway -->|Monitor| Monitoring

    EmailQueue -->|Async Processing| NotificationService

    style Client fill:#e1f5ff

    style API fill:#fff3e0

    style Backend fill:#f3e5f5

    style Data fill:#e8f5e9

    style Storage fill:#fce4ec

    style Security fill:#ffe0b2
