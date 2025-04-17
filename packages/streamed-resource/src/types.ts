type Primitive = string | number | boolean;
export type Key = [Primitive, ...Primitive[]];

export type Status = 'loading' | 'error' | 'success';

export type Result<T, TError, TInitialValue extends T | undefined> =
	| SuccessResult<T>
	| LoadingResult<ResolveLoadingData<T, TInitialValue>>
	| ErrorResult<TError>;

export type SuccessResult<T> = {
	status: 'success';
	data: T;
	error: undefined;
	revalidating: boolean;
};

export type LoadingResult<T> = {
	status: 'loading';
	data: T;
	error: undefined;
	revalidating: boolean;
};

export type ErrorResult<TError> = {
	status: 'error';
	data: undefined;
	error: TError;
	revalidating: boolean;
};

type ResolveLoadingData<T, TInitialValue extends T | undefined> = undefined extends TInitialValue
	? undefined
	: T;
