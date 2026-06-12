<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehiculo extends Model
{
    protected $table = 'vehiculos';

    // Campos asignables en masa (create / update)
    protected $fillable = [
        'placa',
        'tipo_vehiculo',
        'capacidad_carga',
        'modelo',
        'marca',
        'estado',
    ];

    // Estados validos permitidos para un vehiculo
    public const ESTADOS = [
        'disponible',
        'en_ruta',
        'mantenimiento',
        'inactivo',
    ];
}
