-- =====================================================
-- Microservicio: ms-auth
-- Base de datos independiente para autenticacion
-- LogiTrans Express - Sistema de Control de Transporte
-- =====================================================

CREATE DATABASE IF NOT EXISTS ms_auth
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ms_auth;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol ENUM('administrador', 'logistica', 'operador') NOT NULL,
    token VARCHAR(255) NULL,
    sesion_activa BOOLEAN DEFAULT FALSE,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL
);

INSERT INTO usuarios (
    nombre, correo, usuario, contrasena, rol,
    token, sesion_activa, estado, created_at, updated_at
)
VALUES
(
    'Administrador General',
    'admin@logitrans.com',
    'admin',
    'admin123',
    'administrador',
    NULL, FALSE, 'activo', NOW(), NOW()
),
(
    'Operador Logistico',
    'logistica@logitrans.com',
    'logistica',
    'logistica123',
    'logistica',
    NULL, FALSE, 'activo', NOW(), NOW()
);
