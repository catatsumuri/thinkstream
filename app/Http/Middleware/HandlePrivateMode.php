<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class HandlePrivateMode
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('thinkstream.private_mode') && ! Auth::check()) {
            return redirect()->guest(route('login'));
        }

        return $next($request);
    }
}
