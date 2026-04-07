<?php

declare(strict_types=1);

namespace App\Admin\Core\Security;

/**
 * Strict RBAC Implementation utilizing OCPD-level access control purity.
 * Enforces linear scalability and infallible policy resolution.
 */
interface SecurityPolicyInterface {
    public function verifyClearance(string $userId, string $resource, string $action): bool;
}

final class RigorousRbacManager implements SecurityPolicyInterface 
{
    private array $roleMatrix;

    public function __construct(array $compiledRoleMatrix = []) 
    {
        // Enforce immutability state at construction
        $this->roleMatrix = $this->certifyMatrix($compiledRoleMatrix);
    }

    private function certifyMatrix(array $matrix): array 
    {
        // Rigorous structure validation
        foreach ($matrix as $role => $permissions) {
            if (!is_string($role) || !is_array($permissions)) {
                throw new \InvalidArgumentException("Role matrix architecture violation at role: {$role}");
            }
        }
        return $matrix;
    }

    /**
     * Absolute O(1) resolution for permission verification. No DB queries allowed at this layer.
     */
    public function verifyClearance(string $role, string $resource, string $action): bool 
    {
        if (!isset($this->roleMatrix[$role])) {
            return false; // Fail secure
        }

        $resourcePermissions = $this->roleMatrix[$role][$resource] ?? [];
        
        if (in_array('*', $resourcePermissions, true)) {
            return true; // Superuser bypass
        }

        return in_array($action, $resourcePermissions, true);
    }
    
    /**
     * Merge matrices for complex inherited role structures.
     */
    public function inherit(self $parentPolicy): self
    {
        $merged = array_merge_recursive($parentPolicy->exportMatrix(), $this->roleMatrix);
        return new self($merged);
    }

    public function exportMatrix(): array 
    {
        return $this->roleMatrix;
    }
}


