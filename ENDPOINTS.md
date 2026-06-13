# LOGITRANS — Documentación de Endpoints

Sistema de Control de Rutas y Transporte de Carga. Arquitectura de microservicios:
cada servicio es independiente, tiene su propia base de datos y expone una API REST
que responde en formato JSON. La comunicación se realiza únicamente entre el
frontend y cada microservicio.

## Puertos y bases de datos

| Microservicio    | Puerto local | Base de datos     | Responsabilidad                       |
|------------------|--------------|-------------------|---------------------------------------|
| ms-vehiculos     | `8000`       | `ms_vehiculos`    | Gestión de vehículos                  |
| ms-conductores   | `8001`       | `ms_conductores`  | Gestión de conductores                |
| ms-auth          | `8002`       | `ms_auth`         | Autenticación                         |
| ms-rutas         | `8003`       | `ms_rutas`        | Gestión de rutas                      |
| ms-viajes        | `8004`       | `ms_viajes`       | Programación, viajes y seguimiento    |

Arranque de cada servicio (desde la carpeta del microservicio):

```bash
php -S localhost:<puerto> -t public
```

## Formato de respuesta

Todas las respuestas son JSON. Las operaciones devuelven un sobre común:

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "Descripción del error" }
```

Códigos HTTP: `200` OK · `201` Creado · `400` Datos inválidos ·
`401` No autenticado · `403` Prohibido · `404` No encontrado · `409` Conflicto.

---

## ms-auth — Autenticación (`:8002`)

| Método | Ruta       | Descripción                          | Body |
|--------|------------|--------------------------------------|------|
| GET    | `/`        | Estado del servicio                  | — |
| POST   | `/login`   | Inicia sesión, genera token          | `{ "usuario": "admin", "contrasena": "admin123" }` (acepta `usuario` o `correo`) |
| POST   | `/logout`  | Cierra sesión, invalida el token     | `{ "token": "…" }` o header `Authorization: Bearer <token>` |
| GET    | `/validar` | Valida token + sesión activa         | header `Authorization: Bearer <token>` |

**Login (éxito)** → `data: { token, usuario }`. Credenciales incorrectas → `401`.

---

## ms-conductores — Conductores (`:8001`)

| Método | Ruta                | Descripción                  |
|--------|---------------------|------------------------------|
| GET    | `/`                 | Estado del servicio          |
| GET    | `/conductores`      | Listar (filtros opcionales)  |
| POST   | `/conductores`      | Crear conductor              |
| GET    | `/conductores/{id}` | Obtener por id               |
| PUT    | `/conductores/{id}` | Editar conductor             |
| DELETE | `/conductores/{id}` | Eliminar conductor           |

**Filtros (query string):** `?documento=` · `?licencia=` · `?estado=`
(`disponible` | `en_ruta` | `inactivo`).

**Body crear/editar:**
```json
{
  "nombres": "Andrés", "apellidos": "Martínez",
  "documento": "1000789456", "telefono": "3014567890",
  "correo": "andres@correo.com", "numero_licencia": "LIC12345",
  "categoria_licencia": "C2", "fecha_vencimiento_licencia": "2030-01-20",
  "estado": "disponible"
}
```
**Validaciones:** documento/licencia/correo únicos · correo válido ·
fecha de vencimiento futura · estado válido.

---

## ms-vehiculos — Vehículos (`:8000`)

| Método | Ruta              | Descripción                 |
|--------|-------------------|-----------------------------|
| GET    | `/`               | Estado del servicio         |
| GET    | `/vehiculos`      | Listar (filtros opcionales) |
| POST   | `/vehiculos`      | Crear vehículo              |
| GET    | `/vehiculos/{id}` | Obtener por id              |
| PUT    | `/vehiculos/{id}` | Editar vehículo             |
| DELETE | `/vehiculos/{id}` | Eliminar vehículo           |

**Filtros (query string):** `?estado=` · `?tipo=` · `?placa=`.
**Estados:** `disponible` | `en_ruta` | `mantenimiento` | `inactivo`.

**Body crear/editar:**
```json
{
  "placa": "ABC123", "tipo_vehiculo": "Camion",
  "capacidad_carga": 10000, "modelo": "2022",
  "marca": "Chevrolet", "estado": "disponible"
}
```
**Validaciones:** placa única · capacidad mayor a cero · estado válido.

---

## ms-rutas — Rutas (`:8003`)

| Método | Ruta          | Descripción                 |
|--------|---------------|-----------------------------|
| GET    | `/`           | Estado del servicio         |
| GET    | `/rutas`      | Listar (filtros opcionales) |
| POST   | `/rutas`      | Crear ruta                  |
| GET    | `/rutas/{id}` | Obtener por id              |
| PUT    | `/rutas/{id}` | Editar ruta                 |
| DELETE | `/rutas/{id}` | Eliminar ruta               |

**Filtros (query string):** `?ciudad=` (origen o destino) · `?origen=` · `?destino=`.

**Body crear/editar:**
```json
{
  "ciudad_origen": "Bogotá", "ciudad_destino": "Tunja",
  "distancia": 150, "tiempo_estimado": "3 horas",
  "observaciones": "Ruta regional"
}
```
**Validaciones:** no rutas duplicadas (mismo origen-destino) ·
distancia mayor a cero · origen ≠ destino.

---

## ms-viajes — Viajes y Seguimiento (`:8004`)

| Método | Ruta                       | Descripción                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/`                        | Estado del servicio                  |
| GET    | `/viajes`                  | Listar viajes (filtros opcionales)   |
| POST   | `/viajes`                  | Programar viaje                      |
| GET    | `/viajes/{id}`             | Obtener programación por id          |
| PUT    | `/viajes/{id}`             | Reprogramar viaje (solo programados) |
| PUT    | `/viajes/{id}/cancelar`    | Cancelar viaje                       |
| PUT    | `/viajes/{id}/iniciar`     | Iniciar viaje programado             |
| PUT    | `/viajes/{id}/estado`      | Actualizar estado                    |
| POST   | `/viajes/{id}/novedad`     | Registrar novedad                    |
| PUT    | `/viajes/{id}/finalizar`   | Finalizar viaje                      |
| GET    | `/viajes/{id}/seguimiento` | Historial y novedades del viaje      |

**Filtros (query string):** `?estado=` · `?conductor=` · `?vehiculo=` · `?fecha=`.
**Estados:** `programado` | `en_transito` | `retrasado` | `finalizado` | `cancelado`.

**Body programar/reprogramar:**
```json
{
  "conductor_id": 1, "vehiculo_id": 1, "ruta_id": 1,
  "fecha_salida": "2026-06-15", "hora_salida": "05:00",
  "fecha_estimada_llegada": "2026-06-15",
  "observaciones": "Carga frágil"
}
```

**Body novedad:** `{ "novedad": "Retraso por clima", "estado": "retrasado" }`

**Validaciones:** fecha de llegada ≥ fecha de salida · conductor/vehículo sin otro
viaje activo · no iniciar viajes cancelados · no finalizar viajes no iniciados ·
existencia de la programación.

---

## Autenticación en el frontend

El frontend almacena el `token` en `localStorage` tras el login y exige sesión
para acceder a los módulos (redirige a `login.html` si no hay token).
Credenciales de prueba: `admin / admin123` · `logistica / logistica123`.
