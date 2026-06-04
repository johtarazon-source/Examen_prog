<?php

namespace App\Controllers;

use App\Models\Conductor;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ConductoresController
{
    /**
     * Listar conductores. Soporta filtros opcionales por query string:
     * ?documento=  ?licencia=  ?estado=
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $query = Conductor::query();

        if (!empty($params['documento'])) {
            $query->where('documento', 'like', '%' . $params['documento'] . '%');
        }
        if (!empty($params['licencia'])) {
            $query->where('numero_licencia', 'like', '%' . $params['licencia'] . '%');
        }
        if (!empty($params['estado'])) {
            $query->where('estado', $params['estado']);
        }

        $conductores = $query->orderBy('id', 'desc')->get();

        return $this->json($response, [
            'success' => true,
            'data'    => $conductores,
        ]);
    }

    /**
     * Obtener un conductor por id.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $conductor = Conductor::find($args['id']);

        if (!$conductor) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        return $this->json($response, [
            'success' => true,
            'data'    => $conductor,
        ]);
    }

    /**
     * Crear un conductor.
     */
    public function store(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();

        $errores = $this->validar($data);
        if (!empty($errores)) {
            return $this->json($response, [
                'success' => false,
                'message' => $errores[0],
            ], 400);
        }

        // Unicidad: documento, licencia y correo
        if ($conflicto = $this->buscarDuplicado($data)) {
            return $this->json($response, [
                'success' => false,
                'message' => $conflicto,
            ], 409);
        }

        $conductor = Conductor::create([
            'nombres'                    => $data['nombres'],
            'apellidos'                  => $data['apellidos'],
            'documento'                  => $data['documento'],
            'telefono'                   => $data['telefono'],
            'correo'                     => $data['correo'],
            'numero_licencia'            => $data['numero_licencia'],
            'categoria_licencia'         => $data['categoria_licencia'],
            'fecha_vencimiento_licencia' => $data['fecha_vencimiento_licencia'],
            'estado'                     => $data['estado'] ?? 'disponible',
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Conductor creado correctamente',
            'data'    => $conductor,
        ], 201);
    }

    /**
     * Editar un conductor existente.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $conductor = Conductor::find($args['id']);

        if (!$conductor) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        $data = (array) $request->getParsedBody();

        $errores = $this->validar($data);
        if (!empty($errores)) {
            return $this->json($response, [
                'success' => false,
                'message' => $errores[0],
            ], 400);
        }

        // Unicidad excluyendo el propio registro
        if ($conflicto = $this->buscarDuplicado($data, $conductor->id)) {
            return $this->json($response, [
                'success' => false,
                'message' => $conflicto,
            ], 409);
        }

        $conductor->update([
            'nombres'                    => $data['nombres'],
            'apellidos'                  => $data['apellidos'],
            'documento'                  => $data['documento'],
            'telefono'                   => $data['telefono'],
            'correo'                     => $data['correo'],
            'numero_licencia'            => $data['numero_licencia'],
            'categoria_licencia'         => $data['categoria_licencia'],
            'fecha_vencimiento_licencia' => $data['fecha_vencimiento_licencia'],
            'estado'                     => $data['estado'] ?? $conductor->estado,
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Conductor actualizado correctamente',
            'data'    => $conductor,
        ]);
    }

    /**
     * Eliminar un conductor.
     */
    public function destroy(Request $request, Response $response, array $args): Response
    {
        $conductor = Conductor::find($args['id']);

        if (!$conductor) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        $conductor->delete();

        return $this->json($response, [
            'success' => true,
            'message' => 'Conductor eliminado correctamente',
        ]);
    }

    /**
     * Validaciones obligatorias del examen (seccion 8.2).
     * Retorna un arreglo de mensajes de error (vacio si todo es valido).
     */
    private function validar(array $data): array
    {
        $errores = [];

        $requeridos = [
            'nombres', 'apellidos', 'documento', 'telefono', 'correo',
            'numero_licencia', 'categoria_licencia', 'fecha_vencimiento_licencia',
        ];
        foreach ($requeridos as $campo) {
            if (!isset($data[$campo]) || $data[$campo] === '' || $data[$campo] === null) {
                $errores[] = "El campo '$campo' es obligatorio";
                return $errores;
            }
        }

        // Correo con formato valido
        if (!filter_var($data['correo'], FILTER_VALIDATE_EMAIL)) {
            $errores[] = 'El correo electronico no es valido';
            return $errores;
        }

        // Fecha de vencimiento de licencia: formato valido y no vencida
        $fecha = \DateTime::createFromFormat('Y-m-d', $data['fecha_vencimiento_licencia']);
        if (!$fecha || $fecha->format('Y-m-d') !== $data['fecha_vencimiento_licencia']) {
            $errores[] = 'La fecha de vencimiento de licencia no tiene un formato valido (YYYY-MM-DD)';
            return $errores;
        }
        $hoy = new \DateTime('today');
        if ($fecha < $hoy) {
            $errores[] = 'La licencia esta vencida; la fecha de vencimiento debe ser futura';
            return $errores;
        }

        // Estado valido (si se envia)
        if (isset($data['estado']) && $data['estado'] !== '' && !in_array($data['estado'], Conductor::ESTADOS, true)) {
            $errores[] = 'El estado no es valido. Debe ser: ' . implode(', ', Conductor::ESTADOS);
            return $errores;
        }

        return $errores;
    }

    /**
     * Verifica unicidad de documento, licencia y correo.
     * $ignorarId permite excluir el propio registro al editar.
     * Retorna el mensaje de conflicto, o null si no hay duplicados.
     */
    private function buscarDuplicado(array $data, ?int $ignorarId = null): ?string
    {
        $campos = [
            'documento'       => 'documento',
            'numero_licencia' => 'numero de licencia',
            'correo'          => 'correo',
        ];

        foreach ($campos as $columna => $etiqueta) {
            $query = Conductor::where($columna, $data[$columna]);
            if ($ignorarId !== null) {
                $query->where('id', '!=', $ignorarId);
            }
            if ($query->exists()) {
                return "Ya existe un conductor con ese $etiqueta";
            }
        }

        return null;
    }

    /**
     * Helper para responder JSON con el codigo HTTP indicado.
     */
    private function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
