-- =====================================================
-- Microservicio: ms-vehiculos
-- Base de datos independiente para gestion de vehiculos
-- LogiTrans Express - Sistema de Control de Transporte
-- =====================================================

CREATE DATABASE IF NOT EXISTS ms_vehiculos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ms_vehiculos;

CREATE TABLE IF NOT EXISTS vehiculos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(20) NOT NULL UNIQUE,
    tipo_vehiculo VARCHAR(100) NOT NULL,
    capacidad_carga DECIMAL(10,2) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    estado ENUM(
        'disponible',
        'en_ruta',
        'mantenimiento',
        'inactivo'
    ) DEFAULT 'disponible',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

INSERT INTO vehiculos (
    placa,
    tipo_vehiculo,
    capacidad_carga,
    modelo,
    marca,
    estado,
    created_at,
    updated_at
)
VALUES
(
    'ABC123',
    'Camion',
    5000,
    '2022',
    'Chevrolet',
    'disponible',
    NOW(),
    NOW()
),
(
    'XYZ789',
    'Furgon',
    2500,
    '2021',
    'Renault',
    'disponible',
    NOW(),
    NOW()
);
