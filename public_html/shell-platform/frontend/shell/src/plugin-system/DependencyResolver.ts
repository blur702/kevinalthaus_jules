/**
 * DependencyResolver - Resolves plugin dependencies and load order
 * Implements topological sorting for dependency resolution
 */

import { PluginManifest } from './types';

export class DependencyResolver {
  /**
   * Resolve plugin load order based on dependencies
   */
  public resolveLoadOrder(plugins: Map<string, PluginManifest>): string[] {
    const graph = this.buildDependencyGraph(plugins);
    return this.topologicalSort(graph);
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(plugins: Map<string, PluginManifest>): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    // Initialize graph with all plugins
    for (const [id, manifest] of plugins) {
      graph.set(id, new Set());
      
      // Add dependencies
      for (const dep of manifest.dependencies) {
        if (!dep.optional && plugins.has(dep.id)) {
          graph.get(id)!.add(dep.id);
        }
      }
    }
    
    return graph;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] {
    const result: string[] = [];
    const inDegree = new Map<string, number>();
    
    // Calculate in-degree for each node
    for (const [node, _] of graph) {
      inDegree.set(node, 0);
    }
    
    for (const [_, dependencies] of graph) {
      for (const dep of dependencies) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }
    
    // Find all nodes with in-degree of 0
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }
    
    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      
      // Reduce in-degree for dependent nodes
      for (const [dependent, dependencies] of graph) {
        if (dependencies.has(node)) {
          dependencies.delete(node);
          const newDegree = (inDegree.get(dependent) || 1) - 1;
          inDegree.set(dependent, newDegree);
          
          if (newDegree === 0) {
            queue.push(dependent);
          }
        }
      }
    }
    
    // Check for cycles
    if (result.length !== graph.size) {
      const remaining = Array.from(graph.keys()).filter(node => !result.includes(node));
      throw new Error(`Circular dependency detected in plugins: ${remaining.join(', ')}`);
    }
    
    return result;
  }

  /**
   * Check if dependencies are satisfied
   */
  public checkDependencies(
    manifest: PluginManifest, 
    availablePlugins: Set<string>
  ): { satisfied: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const dep of manifest.dependencies) {
      if (!dep.optional && !availablePlugins.has(dep.id)) {
        missing.push(dep.id);
      }
    }
    
    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Get dependent plugins
   */
  public getDependents(
    pluginId: string,
    plugins: Map<string, PluginManifest>
  ): string[] {
    const dependents: string[] = [];
    
    for (const [id, manifest] of plugins) {
      const hasDependency = manifest.dependencies.some(
        dep => dep.id === pluginId && !dep.optional
      );
      
      if (hasDependency) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  /**
   * Get plugin dependencies recursively
   */
  public getDependenciesRecursive(
    pluginId: string,
    plugins: Map<string, PluginManifest>,
    visited: Set<string> = new Set()
  ): string[] {
    if (visited.has(pluginId)) {
      return [];
    }
    
    visited.add(pluginId);
    const manifest = plugins.get(pluginId);
    
    if (!manifest) {
      return [];
    }
    
    const dependencies: string[] = [];
    
    for (const dep of manifest.dependencies) {
      if (!dep.optional && plugins.has(dep.id)) {
        dependencies.push(dep.id);
        dependencies.push(
          ...this.getDependenciesRecursive(dep.id, plugins, visited)
        );
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Check version compatibility
   */
  public checkVersionCompatibility(
    required: string,
    available: string
  ): boolean {
    // Simple semver-like comparison
    // Format: major.minor.patch
    const parseVersion = (v: string) => {
      const parts = v.split('.').map(p => parseInt(p, 10));
      return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
      };
    };
    
    const req = parseVersion(required);
    const avail = parseVersion(available);
    
    // Check if available version satisfies requirement
    // Using caret range (^) semantics: compatible with specified version
    if (avail.major !== req.major) {
      return avail.major > req.major;
    }
    
    if (avail.minor !== req.minor) {
      return avail.minor > req.minor;
    }
    
    return avail.patch >= req.patch;
  }

  /**
   * Generate dependency tree
   */
  public generateDependencyTree(
    pluginId: string,
    plugins: Map<string, PluginManifest>,
    level: number = 0,
    visited: Set<string> = new Set()
  ): any {
    if (visited.has(pluginId)) {
      return { id: pluginId, circular: true };
    }
    
    visited.add(pluginId);
    const manifest = plugins.get(pluginId);
    
    if (!manifest) {
      return { id: pluginId, missing: true };
    }
    
    const tree: any = {
      id: pluginId,
      name: manifest.name,
      version: manifest.version,
      dependencies: [],
    };
    
    for (const dep of manifest.dependencies) {
      tree.dependencies.push({
        ...this.generateDependencyTree(dep.id, plugins, level + 1, new Set(visited)),
        optional: dep.optional,
        version: dep.version,
      });
    }
    
    return tree;
  }
}