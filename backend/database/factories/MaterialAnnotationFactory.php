<?php

namespace Database\Factories;

use App\Models\Material;
use App\Models\MaterialAnnotation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MaterialAnnotation>
 */
class MaterialAnnotationFactory extends Factory
{
    protected $model = MaterialAnnotation::class;

    public function definition(): array
    {
        return [
            'client_uuid' => Str::uuid(),
            'material_id' => Material::factory(),
            'page_number' => 1,
            'type' => 'highlight',
            'data' => [
                'x' => 0.1,
                'y' => 0.1,
                'width' => 0.2,
                'height' => 0.03,
                'color' => '#FFE66D',
            ],
        ];
    }
}
