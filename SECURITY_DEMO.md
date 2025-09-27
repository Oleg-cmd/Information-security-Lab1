# Демонстрация защиты от SQL-инъекций

## Как Sequelize защищает от SQL-инъекций

### 1. Параметризованные запросы

**Раньше (уязвимо):**
```javascript
// ❌ УЯЗВИМО - конкатенация строк
const query = `SELECT * FROM users WHERE username = '${username}'`;
db.query(query);
```

**Сейчас (безопасно):**
```javascript
// ✅ БЕЗОПАСНО - Sequelize автоматически использует параметризованные запросы
const user = await User.findOne({
  where: { username: username }
});
```

### 2. Реальный пример атаки

**Попытка атаки:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'"'"'; DROP TABLE users; --","password":"any"}'
```

**Корректный login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

**Что происходит:**
1. Sequelize получает значение: `admin'; DROP TABLE users; --`
2. Генерирует безопасный SQL: `SELECT * FROM users WHERE (username = ? OR email = ?)`
3. Передает параметры отдельно: `["admin'; DROP TABLE users; --", "admin'; DROP TABLE users; --"]`
4. База данных воспринимает это как обычную строку для поиска

### 3. Дополнительная валидация

```javascript
// Валидация на уровне express-validator
body('username')
  .trim()
  .isLength({ min: 3, max: 100 })
  .matches(/^[a-zA-Z0-9@._-]+$/)
  .withMessage('Username contains invalid characters')

// Валидация на уровне Sequelize модели
username: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    len: [3, 30],
    isAlphanumeric: true
  }
}
```

### 4. Защита от XSS

**Библиотека xss:**
```javascript
function sanitizeInput(input) {
  return xss(input, {
    whiteList: {}, // Никакие HTML теги не разрешены
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}
```

### 5. Тестирование защиты

Попробуйте эти атаки - они будут безопасно обработаны:

**SQL-инъекция в логине:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin OR 1=1 --","password":"any"}'
```

**XSS в создании поста:**
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"<script>alert(\"XSS\")</script>","content":"Evil content"}'
```

**HTTP Parameter Pollution:**
```bash
curl "http://localhost:3000/api/data?sort=name&sort=date&sort=id"
```

Все эти атаки будут безопасно нашими защитными механизмами.