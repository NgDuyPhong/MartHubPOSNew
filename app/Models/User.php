<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /**
     * Capabilities are intentionally kept in code until the admin permission model is introduced.
     * This map is the single server/UI contract for the current role set.
     *
     * @var array<string, list<string>>
     */
    private const ROLE_CAPABILITIES = [
        'owner' => ['*'],
        'manager' => [
            'catalog.manage',
            'customer.manage',
            'customer.view',
            'debt.collect',
            'inventory.receive',
            'inventory.view',
            'import.legacy',
            'offline.sales.recover',
            'pos.sell',
            'report.view',
            'sales.return',
            'sales.view',
            'shift.cash_movement',
            'shift.close',
            'shift.open',
            'shift.reconcile',
            'shift.view',
        ],
        'cashier' => [
            'customer.manage',
            'customer.view',
            'debt.collect',
            'inventory.view',
            'pos.sell',
            'report.view',
            'sales.view',
            'shift.close',
            'shift.open',
            'shift.view',
        ],
    ];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'organization_id',
        'branch_id',
        'role',
        'approval_pin_hash',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'approval_pin_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Return the capabilities available to the active user.
     *
     * @return list<string>
     */
    public function capabilities(): array
    {
        if (! $this->is_active) {
            return [];
        }

        return self::ROLE_CAPABILITIES[$this->role] ?? [];
    }

    public function hasCapability(string $capability): bool
    {
        $capabilities = $this->capabilities();

        return in_array('*', $capabilities, true) || in_array($capability, $capabilities, true);
    }

    public function canManageCatalog(): bool
    {
        return $this->hasCapability('catalog.manage');
    }
}
