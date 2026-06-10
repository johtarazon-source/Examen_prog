-- =====================================================
-- Microservicio: ms-viajes
-- Base de datos independiente para seguimiento de viajes
-- LogiTrans Express - Sistema de Control de Transporte
--
-- Incluye una tabla 'programaciones_viajes' minima (datos de
-- ejemplo) para que el microservicio sea autonomo y probable,
-- y la tabla 'seguimientos_viajes' para el control operativo.
-- =====================================================

CREATE DATABASE IF NOT EXISTS ms_viajes
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ms_viajes;

-- Programaciones de viajes (insumo para el seguimiento)
CREATE TABLE IF NOT EXISTS programaciones_viajes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conductor_id BIGINT UNSIGNED NOT NULL,
    vehiculo_id BIGINT UNSIGNED NOT NULL,
    ruta_id BIGINT UNSIGNED NOT NULL,
    fecha_salida DATE NOT NULL,
    hora_salida TIME NOT NULL,
    fecha_estimada_llegada DATE NOT NULL,
    observaciones TEXT NULL,
    estado ENUM(
        'programado',
        'en_transito',
        'retrasado',
        'finalizado',
        'cancelado'
    ) DEFAULT 'programado',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

-- Seguimientos / novedades de cada viaje
CREATE TABLE IF NOT EXISTS seguimientos_viajes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    programacion_viaje_id BIGINT UNSIGNED NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado ENUM(
        'programado',
        'en_transito',
        'retrasado',
        'finalizado',
        'cancelado'
    ) NOT NULL,
    novedad TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

-- Datos de ejemplo: 3 programaciones en distintos estados
INSERT INTO programaciones_viajes (
    conductor_id, vehiculo_id, ruta_id,
    fecha_salida, hora_salida, fecha_estimada_llegada,
    observaciones, estado, created_at, updated_at
)
VALUES
(1, 1, 1, '2026-06-15', '06:00:00', '2026-06-15', 'Carga de alimentos', 'programado', NOW(), NOW()),
(2, 2, 2, '2026-06-16', '07:30:00', '2026-06-16', 'Carga de materiales', 'programado', NOW(), NOW()),
(1, 1, 1, '2026-06-10', '05:00:00', '2026-06-10', 'Viaje cancelado por clima', 'cancelado', NOW(), NOW());

-- Seguimiento de ejemplo para la programacion 1
INSERT INTO seguimientos_viajes (
    programacion_viaje_id, fecha, hora, estado, novedad, created_at, updated_at
)
VALUES
(1, '2026-06-15', '06:00:00', 'programado', 'Viaje registrado y listo para iniciar', NOW(), NOW());
