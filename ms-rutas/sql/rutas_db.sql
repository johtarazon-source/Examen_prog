-- =====================================================
-- Microservicio: ms-rutas
-- Base de datos independiente para gestion de rutas
-- LogiTrans Express - Sistema de Control de Transporte
-- =====================================================

CREATE DATABASE IF NOT EXISTS ms_rutas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ms_rutas;

CREATE TABLE IF NOT EXISTS rutas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ciudad_origen VARCHAR(100) NOT NULL,
    ciudad_destino VARCHAR(100) NOT NULL,
    distancia DECIMAL(10,2) NOT NULL,
    tiempo_estimado VARCHAR(50) NOT NULL,
    observaciones TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

INSERT INTO rutas (
    ciudad_origen,
    ciudad_destino,
    distancia,
    tiempo_estimado,
    observaciones,
    created_at,
    updated_at
)
VALUES
(
    'Bogota',
    'Medellin',
    420,
    '8 horas',
    'Ruta principal nacional',
    NOW(),
    NOW()
),
(
    'Tunja',
    'Bogota',
    150,
    '3 horas',
    'Ruta regional',
    NOW(),
    NOW()
);
