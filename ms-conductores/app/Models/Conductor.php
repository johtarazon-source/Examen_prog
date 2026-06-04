<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conductor extends Model
{
    protected $table = 'conductores';

    // Campos asignables en masa (create / update)
    protected $fillable = [
        'nombres',
        'apellidos',
        'documento',
        'telefono',
        'correo',
        'numero_licencia',
        'categoria_licencia',
        'fecha_vencimiento_licencia',
        'estado',
    ];

    // Estados validos permitidos para un conductor
    public const ESTADOS = [
        'disponible',
        'en_ruta',
        'inactivo',
    ];
}
