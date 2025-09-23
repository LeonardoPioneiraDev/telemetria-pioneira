import { DeepPartial, FindOneOptions, Repository } from 'typeorm';

// Classe abstrata que define métodos comuns para todos os repositórios
export abstract class BaseRepository<T extends { id: number }> {
  protected readonly repository: Repository<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  async save(data: DeepPartial<T>): Promise<T> {
    return this.repository.save(data);
  }

  async findOneById(id: number): Promise<T | null> {
    // TypeORM requer que a opção 'where' seja tipada corretamente.
    const options: FindOneOptions<T> = {
      where: { id: id as any },
    };
    return this.repository.findOne(options);
  }

  // Podemos adicionar outros métodos comuns aqui (findAll, delete, etc.)
}
