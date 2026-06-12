-- =====================================================
-- Microservicio: ms-conductores
-- Base de datos independiente para gestion de conductores
-- LogiTrans Express - Sistema de Control de Transporte
-- =====================================================

CREATE DATABASE IF NOT EXISTS ms_conductores
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ms_conductores;

CREATE TABLE IF NOT EXISTS conductores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    documento VARCHAR(30) NOT NULL UNIQUE,
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    numero_licencia VARCHAR(50) NOT NULL UNIQUE,
    categoria_licencia VARCHAR(20) NOT NULL,
    fecha_vencimiento_licencia DATE NOT NULL,
    estado ENUM('disponible', 'en_ruta', 'inactivo') DEFAULT 'disponible',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

INSERT INTO conductores (
    nombres,
    apellidos,
    documento,
    telefono,
    correo,
    numero_licencia,
    categoria_licencia,
    fecha_vencimiento_licencia,
    estado,
    created_at,
    updated_at
)
VALUES
(
    'Carlos',
    'Ramirez',
    '1000123456',
    '3001234567',
    'carlos@logitrans.com',
    'LIC-1001',
    'C2',
    '2027-05-10',
    'disponible',
    NOW(),
    NOW()
),
(
    'Andres',
    'Martinez',
    '1000789456',
    '3014567890',
    'andres@logitrans.com',
    'LIC-1002',
    'C3',
    '2026-12-15',
    'disponible',
    NOW(),
    NOW()
);
