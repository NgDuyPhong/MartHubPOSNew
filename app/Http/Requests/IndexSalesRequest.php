<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IndexSalesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasCapability('sales.view') === true;
    }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function attributes(): array
    {
        return ['from' => 'ngày bắt đầu', 'to' => 'ngày kết thúc'];
    }

    public function messages(): array
    {
        return [
            'from.date_format' => 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.',
            'to.date_format' => 'Ngày kết thúc không đúng định dạng YYYY-MM-DD.',
            'to.after_or_equal' => 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',
        ];
    }
}
