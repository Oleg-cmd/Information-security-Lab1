# Работа 1: Разработка защищенного REST API с интеграцией в CI/CD

## Описание проекта и API

Проект представляет собой защищенное REST API для аутентификации пользователей и управления контентом. Реализована аутентификация с использованием JWT токенов, защищенные эндпоинты для работы с пользовательскими данными и создания постов.

### Базовый URL
`localhost:3000`

## Аутентификация

### Авторизация пользователя
- **Endpoint:** `POST /auth/login`
- **Тип:** Public
- **Тело запроса:**
```json
{
    "username": "admin",
    "password": "Admin123!"
}
```
- **Ответ:**
```json
{
    "message": "Authentication successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
    },
    "expiresIn": "24h"
}
```
- **Описание:** Выполняет вход пользователя и возвращает JWT токен для доступа к защищенным эндпоинтам

### Проверка токена
- **Endpoint:** `GET /auth/verify`
- **Тип:** Public
- **Заголовки:** `Authorization: Bearer <token>`
- **Ответ:**
```json
{
    "message": "Token is valid",
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
    }
}
```
- **Описание:** Проверяет валидность JWT токена

## Работа с данными (требуют JWT токен)

### Получение списка пользователей
- **Endpoint:** `GET /api/data`
- **Тип:** Secured (JWT)
- **Заголовки:** `Authorization: Bearer <token>`
- **Ответ:**
```json
{
    "message": "Data retrieved successfully",
    "data": [
        {
            "id": 1,
            "username": "admin", 
            "email": "admin@example.com",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ],
    "count": 1
}
```
- **Описание:** Возвращает список всех пользователей в системе

### Создание поста
- **Endpoint:** `POST /api/posts`
- **Тип:** Secured (JWT)
- **Заголовки:** `Authorization: Bearer <token>`
- **Тело запроса:**
```json
{
    "title": "Заголовок поста",
    "content": "Содержимое поста"
}
```
- **Ответ:** 
```json
{
    "message": "Post created successfully",
    "data": {
        "id": 1,
        "title": "Заголовок поста",
        "content": "Содержимое поста",
        "author": {
            "id": 1,
            "username": "admin"
        }
    }
}
```
- **Описание:** Создает новый пост от имени аутентифицированного пользователя

### Получение постов
- **Endpoint:** `GET /api/posts`
- **Тип:** Secured (JWT)
- **Заголовки:** `Authorization: Bearer <token>`
- **Ответ:** Список всех постов с информацией об авторах
- **Описание:** Возвращает все созданные посты

### Получение профиля
- **Endpoint:** `GET /api/user/profile`
- **Тип:** Secured (JWT)
- **Заголовки:** `Authorization: Bearer <token>`
- **Ответ:** Профиль текущего пользователя
- **Описание:** Возвращает данные профиля аутентифицированного пользователя

### Получение статистики
- **Endpoint:** `GET /api/stats`
- **Тип:** Secured (JWT)
- **Заголовки:** `Authorization: Bearer <token>`
- **Ответ:** Статистика API (количество пользователей, постов)
- **Описание:** Возвращает общую статистику системы

## Описание реализованных мер защиты

### Защита от SQLi
Для хранения данных пользователей используется ORM Sequelize. Все запросы к базе данных выполняются через параметризованные запросы, конкатенация строк для формирования SQL-запросов не используется. Дополнительно реализована валидация данных на уровне модели с проверкой типов и ограничений.

**Пример безопасного запроса:**
```javascript
const user = await User.findOne({
  where: {
    [Sequelize.Op.or]: [
      { username: username },
      { email: username }
    ]
  }
});
```

### Защита от XSS
Все пользовательские данные проходят санитизацию с помощью библиотеки `xss` перед сохранением и возвратом. Дополнительно используется `express-mongo-sanitize` для защиты от NoSQL инъекций и `hpp` для защиты от HTTP Parameter Pollution. Входные данные валидируются с помощью `express-validator`.

**Реализация санитизации:**
```javascript
function sanitizeInput(input) {
  return xss(input, {
    whiteList: {}, // Никакие HTML теги не разрешены
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}
```

### Защита от Broken Authentication
Защищенные эндпоинты требуют наличия JWT-токена в заголовке Authorization. Токен валидируется на каждый запрос с проверкой существования пользователя в базе данных. Пароли пользователей хранятся в захэшированном виде с использованием bcrypt (cost factor 12). Реализовано rate limiting для попыток входа (максимум 5 попыток за 15 минут).

**Middleware аутентификации:**
```javascript
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findByPk(decoded.userId);
  if (!user) throw new Error('User not found');
  req.user = user.toJSON();
  next();
};
```

## Отчеты SAST/SCA

### Отчет SAST (Static Application Security Testing)
Для статического анализа кода используются следующие инструменты:
- **npm audit** - анализ известных уязвимостей в зависимостях
- **Snyk** - коммерческий сканер безопасности
- **Semgrep** - статический анализатор с правилами безопасности
- **ESLint Security Plugin** - проверка кода на потенциальные уязвимости

![SAST Report](https://github.com/Oleg-cmd/Information-security-Lab1/actions/runs/18060423221/job/51395861290)

<img width="207" height="296" alt="image" src="https://github.com/user-attachments/assets/9b951911-d8f8-4f16-9c25-044d22e1ef6f" />
<img width="603" height="601" alt="image" src="https://github.com/user-attachments/assets/c06f59a2-0543-47dc-8f1c-1d3167bdf21b" />
<img width="668" height="674" alt="image" src="https://github.com/user-attachments/assets/de382ebc-f907-4814-8371-2fcd6c034a72" />
<img width="517" height="560" alt="image" src="https://github.com/user-attachments/assets/6170370a-744a-4f15-83d3-5e31e87ec6b3" />



### Отчет SCA (Software Composition Analysis)  
Для анализа зависимостей используется SNYK

![SCA Report](https://github.com/Oleg-cmd/Information-security-Lab1/actions/runs/18060423221/job/51395861264)

<img width="1164" height="197" alt="image" src="https://github.com/user-attachments/assets/fdda38f7-5f38-43fc-9a12-90e33ea81e1d" />


### CI/CD Pipeline
Настроен автоматический запуск сканеров безопасности при каждом push и pull request. Pipeline включает:

1. **Security Scanning** - статический анализ и проверка зависимостей
2. **Secrets Detection** - поиск учетных данных в коде
3. **Build & Test** - сборка и тестирование приложения
4. **Security Reports** - генерация сводных отчетов

![CI/CD Pipeline](https://github.com/Oleg-cmd/Information-security-Lab1/actions/runs/18060423221)

<img width="1091" height="652" alt="image" src="https://github.com/user-attachments/assets/02168730-46ff-4c89-a56d-a5e2ff62a98b" />


### Тестовые данные

**Пользователи для тестирования:**

| Username | Email             | Password  |
| -------- | ----------------- | --------- |
| admin    | admin@example.com | Admin123! |
| user1    | user1@example.com | User123!  |
| testuser | test@example.com  | Test123!  |

---

**Автор:** Селянта Олег  
**Дата:** 2025  
**Дисциплина:** Информационная безопастность
