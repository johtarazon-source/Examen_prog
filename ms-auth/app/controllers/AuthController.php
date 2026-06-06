<?php

namespace App\Controllers;

use App\Models\Usuario;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
    /**
     * Inicio de sesion (8.1.1).
     * Recibe { usuario|correo, contrasena }. Si las credenciales son
     * correctas genera un token simple, marca la sesion activa y retorna
     * los datos del usuario + token.
     */
    public function login(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();

        $identificador = trim($data['usuario'] ?? $data['correo'] ?? '');
        $contrasena    = $data['contrasena'] ?? '';

        if ($identificador === '' || $contrasena === '') {
            return $this->json($response, [
                'success' => false,
                'message' => 'Usuario/correo y contrasena son obligatorios',
            ], 400);
        }

        // Buscar por usuario o por correo
        $usuario = Usuario::where('usuario', $identificador)
            ->orWhere('correo', $identificador)
            ->first();

        if (!$usuario || $usuario->contrasena !== $contrasena) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Credenciales incorrectas',
            ], 401);
        }

        if ($usuario->estado !== 'activo') {
            return $this->json($response, [
                'success' => false,
                'message' => 'El usuario esta inactivo',
            ], 403);
        }

        // Generar token simple y activar sesion
        $usuario->token = bin2hex(random_bytes(32));
        $usuario->sesion_activa = true;
        $usuario->save();

        return $this->json($response, [
            'success' => true,
            'message' => 'Inicio de sesion exitoso',
            'data'    => [
                'token'   => $usuario->token,
                'usuario' => $usuario,
            ],
        ]);
    }

    /**
     * Cierre de sesion (8.1.2).
     * Recibe el token (header Authorization o body) e invalida la sesion.
     */
    public function logout(Request $request, Response $response): Response
    {
        $token = $this->extraerToken($request);

        if ($token === '') {
            return $this->json($response, [
                'success' => false,
                'message' => 'Token no proporcionado',
            ], 400);
        }

        $usuario = Usuario::where('token', $token)->first();

        if (!$usuario) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Token invalido',
            ], 401);
        }

        $usuario->token = null;
        $usuario->sesion_activa = false;
        $usuario->save();

        return $this->json($response, [
            'success' => true,
            'message' => 'Sesion cerrada correctamente',
        ]);
    }

    /**
     * Validacion de sesion (8.1.3).
     * Verifica que el token exista y la sesion este activa.
     */
    public function validar(Request $request, Response $response): Response
    {
        $token = $this->extraerToken($request);

        $usuario = $token !== ''
            ? Usuario::where('token', $token)->where('sesion_activa', true)->first()
            : null;

        if (!$usuario) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Sesion no valida o expirada',
            ], 401);
        }

        return $this->json($response, [
            'success' => true,
            'message' => 'Sesion valida',
            'data'    => $usuario,
        ]);
    }

    /**
     * Extrae el token del header Authorization (Bearer) o del body.
     */
    private function extraerToken(Request $request): string
    {
        $header = $request->getHeaderLine('Authorization');
        if (stripos($header, 'Bearer ') === 0) {
            return trim(substr($header, 7));
        }

        $data = (array) $request->getParsedBody();
        return trim($data['token'] ?? '');
    }

    private function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
