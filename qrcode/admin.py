from django.contrib import admin

from .models import About, Category, Faculty, Product, Teacher


admin.site.register(Product)
admin.site.register(Faculty)
admin.site.register(Teacher)
admin.site.register(About)
admin.site.register(Category)
